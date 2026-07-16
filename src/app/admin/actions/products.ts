"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { ProductStatus } from "@/generated/prisma";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import {
  catalogLineFromCategory,
  MAX_FEATURED_PER_LINE,
  type CatalogLine,
} from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage } from "@/lib/uploads";

export type ProductActionState = {
  error?: string;
};

const categoryLineSelect = {
  name: true,
  slug: true,
  parent: { select: { name: true, slug: true } },
} as const;

async function resolveCatalogLine(categoryId: string | null | undefined): Promise<CatalogLine> {
  if (!categoryId) return "REP";
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: categoryLineSelect,
  });
  return catalogLineFromCategory(category);
}

async function countFeaturedInLine(line: CatalogLine, excludeId?: string) {
  const featured = await prisma.product.findMany({
    where: {
      featured: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: {
      id: true,
      category: { select: categoryLineSelect },
    },
  });
  return featured.filter((product) => catalogLineFromCategory(product.category) === line).length;
}

async function featuredProductsInLine(line: CatalogLine) {
  const featured = await prisma.product.findMany({
    where: { featured: true },
    select: {
      id: true,
      slug: true,
      homepageOrder: true,
      updatedAt: true,
      createdAt: true,
      category: { select: categoryLineSelect },
    },
    orderBy: [{ homepageOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "asc" }],
  });
  return featured.filter((product) => catalogLineFromCategory(product.category) === line);
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length ? value : null;
}

function csvValue(formData: FormData, key: string) {
  return stringValue(formData, key)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(stringValue(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function optionalNumber(formData: FormData, key: string) {
  const value = stringValue(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File)) return null;
  if (!value.size) return null;
  return value;
}

function productData(formData: FormData) {
  const name = stringValue(formData, "name");
  const slug = stringValue(formData, "slug") || slugify(name);

  if (!name) {
    throw new Error("Product name is required.");
  }

  return {
    name,
    slug,
    shortDescription: optionalString(formData, "shortDescription"),
    longDescription: optionalString(formData, "longDescription"),
    brand: optionalString(formData, "brand") ?? "rep.markets",
    price: numberValue(formData, "price"),
    salePrice: optionalNumber(formData, "salePrice"),
    qualityPrices: {
      NORMAL: optionalNumber(formData, "qualityPriceNORMAL"),
      GOOD: optionalNumber(formData, "qualityPriceGOOD"),
      HIGH: optionalNumber(formData, "qualityPriceHIGH"),
      ONE_TO_ONE: optionalNumber(formData, "qualityPriceONE_TO_ONE"),
      MIRROR: optionalNumber(formData, "qualityPriceMIRROR"),
    },
    sku: optionalString(formData, "sku"),
    stock: numberValue(formData, "stock", 1000),
    sizes: csvValue(formData, "sizes"),
    colors: csvValue(formData, "colors"),
    tags: csvValue(formData, "tags"),
    weight: optionalNumber(formData, "weight"),
    material: optionalString(formData, "material"),
    status: (stringValue(formData, "status") || "ACTIVE") as ProductStatus,
    featured: formData.get("featured") === "on",
    newArrival: formData.get("newArrival") === "on",
    // Slot order is owned by featured-slot tools — never take free-form values from the form
    homepageOrder: null as number | null,
    categoryId: optionalString(formData, "categoryId"),
  };
}

async function resolveImageUrl(formData: FormData, fileKey: string, existingKey: string) {
  const uploaded = await saveUploadedImage(fileValue(formData, fileKey));
  if (uploaded) return uploaded;
  return optionalString(formData, existingKey);
}

async function replaceProductMedia(productId: string, formData: FormData) {
  const MAX_IMAGES = 15;
  const productName = stringValue(formData, "name") || "Product";
  const urls: string[] = [];

  for (let index = 0; index < MAX_IMAGES; index += 1) {
    const url = await resolveImageUrl(formData, `image${index}`, `existingImageUrl${index}`);
    if (url) urls.push(url);
  }

  await prisma.productMedia.deleteMany({
    where: { productId },
  });

  if (!urls.length) return;

  await prisma.productMedia.createMany({
    data: urls.map((url, sortOrder) => ({
      productId,
      url,
      kind: "ITEM",
      alt: `${productName} image ${sortOrder + 1}`,
      sortOrder,
    })),
  });
}

function bustCatalogCache(slug?: string) {
  revalidateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin/products");
  if (slug) {
    revalidatePath(`/product/${slug}`);
  }
}

function actionError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not save product. Try fewer or smaller images (under 8MB each).";
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();

  let data: ReturnType<typeof productData>;
  try {
    data = productData(formData);
  } catch (error) {
    return { error: actionError(error) };
  }

  try {
    const wantsFeatured = data.featured;
    if (wantsFeatured) {
      const line = await resolveCatalogLine(data.categoryId);
      const featuredCount = await countFeaturedInLine(line);
      if (featuredCount >= MAX_FEATURED_PER_LINE) {
        return {
          error: `Already ${MAX_FEATURED_PER_LINE} featured ${line === "NON_REP" ? "NON-REP" : "REP"} products. Remove one from the slots on Products, then try again.`,
        };
      }
    }

    const brandLogoUrl = await resolveImageUrl(formData, "brandLogo", "existingBrandLogoUrl");

    const product = await prisma.product.create({
      data: {
        ...data,
        brandLogoUrl: brandLogoUrl || null,
        homepageOrder: wantsFeatured ? MAX_FEATURED_PER_LINE + 1 : null,
      },
    });

    await replaceProductMedia(product.id, formData);
    await repairFeaturedSlots();
    bustCatalogCache(product.slug);
  } catch (error) {
    console.error("createProduct failed", error);
    return { error: actionError(error) };
  }

  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();

  let data: ReturnType<typeof productData>;
  try {
    data = productData(formData);
  } catch (error) {
    return { error: actionError(error) };
  }

  try {
    const wantsFeatured = data.featured;
    if (wantsFeatured) {
      const line = await resolveCatalogLine(data.categoryId);
      const featuredCount = await countFeaturedInLine(line, id);
      if (featuredCount >= MAX_FEATURED_PER_LINE) {
        return {
          error: `Already ${MAX_FEATURED_PER_LINE} featured ${line === "NON_REP" ? "NON-REP" : "REP"} products. Remove one from the slots on Products, then try again.`,
        };
      }
    }

    const brandLogoUrl = await resolveImageUrl(formData, "brandLogo", "existingBrandLogoUrl");

    await prisma.product.update({
      where: { id },
      data: {
        ...data,
        brandLogoUrl: brandLogoUrl || null,
        homepageOrder: wantsFeatured ? MAX_FEATURED_PER_LINE + 1 : null,
      },
    });

    await replaceProductMedia(id, formData);
    await repairFeaturedSlots();
    revalidatePath(`/admin/products/edit/${id}`);
    bustCatalogCache(data.slug);
  } catch (error) {
    console.error("updateProduct failed", error);
    return { error: actionError(error) };
  }

  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  if (!id) {
    return;
  }

  try {
    await prisma.productMedia.deleteMany({ where: { productId: id } });
    await prisma.wishlistItem.deleteMany({ where: { productId: id } });
    await prisma.orderItem.updateMany({
      where: { productId: id },
      data: { productId: null },
    });
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    console.error("deleteProduct failed", error);
    throw new Error(
      error instanceof Error ? error.message : "Could not delete product. It may be linked to existing orders.",
    );
  }

  bustCatalogCache();
  redirect("/admin/products");
}

const MAX_FEATURED = MAX_FEATURED_PER_LINE;

/**
 * Force featured products into unique slots 1…N per catalog line (REP / NON-REP).
 * Drops extras beyond the per-line max. Safe to run on every admin products visit.
 */
export async function repairFeaturedSlots() {
  const lines: CatalogLine[] = ["REP", "NON_REP"];
  let touched = false;

  for (const line of lines) {
    const featured = await featuredProductsInLine(line);
    const keep = featured.slice(0, MAX_FEATURED);
    const drop = featured.slice(MAX_FEATURED);
    const alreadyClean =
      drop.length === 0 &&
      keep.every((product, index) => product.homepageOrder === index + 1);

    if (alreadyClean) continue;
    touched = true;

    await prisma.$transaction([
      ...drop.map((product) =>
        prisma.product.update({
          where: { id: product.id },
          data: { featured: false, homepageOrder: null },
        }),
      ),
      ...keep.map((product, index) =>
        prisma.product.update({
          where: { id: product.id },
          data: {
            featured: true,
            homepageOrder: 1000 + index,
          },
        }),
      ),
      ...keep.map((product, index) =>
        prisma.product.update({
          where: { id: product.id },
          data: { homepageOrder: index + 1 },
        }),
      ),
    ]);
  }

  if (touched) bustCatalogCache();
}

export async function toggleFeaturedProduct(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  if (!id) return;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      featured: true,
      slug: true,
      category: { select: categoryLineSelect },
    },
  });

  if (!product) return;

  const line = catalogLineFromCategory(product.category);

  if (product.featured) {
    await prisma.product.update({
      where: { id },
      data: { featured: false, homepageOrder: null },
    });
    await repairFeaturedSlots();
    bustCatalogCache(product.slug);
    redirect("/admin/products");
  }

  const featuredCount = await countFeaturedInLine(line);
  if (featuredCount >= MAX_FEATURED) {
    redirect(`/admin/products?featuredError=limit&line=${line}`);
  }

  await prisma.product.update({
    where: { id },
    data: { featured: true, homepageOrder: 1000 },
  });
  await repairFeaturedSlots();

  bustCatalogCache(product.slug);
  redirect("/admin/products");
}

export async function moveFeaturedProduct(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  const direction = stringValue(formData, "direction");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const current = await prisma.product.findUnique({
    where: { id },
    select: { id: true, category: { select: categoryLineSelect } },
  });
  if (!current) return;

  const line = catalogLineFromCategory(current.category);
  const featured = await featuredProductsInLine(line);

  const index = featured.findIndex((product) => product.id === id);
  if (index < 0) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= featured.length) {
    redirect("/admin/products");
  }

  const ordered = featured.map((product) => product.id);
  const tmp = ordered[index];
  ordered[index] = ordered[swapWith];
  ordered[swapWith] = tmp;

  await prisma.$transaction([
    ...ordered.map((productId, orderIndex) =>
      prisma.product.update({
        where: { id: productId },
        data: { homepageOrder: 1000 + orderIndex },
      }),
    ),
    ...ordered.map((productId, orderIndex) =>
      prisma.product.update({
        where: { id: productId },
        data: { homepageOrder: orderIndex + 1 },
      }),
    ),
  ]);

  bustCatalogCache(featured[index]?.slug);
  redirect("/admin/products");
}

/**
 * Relink product_media rows that still point at dead disk paths
 * (`/api/media/products/...`) when the bytes exist in stored_files by filename.
 */
export async function repairLegacyMediaLinks() {
  await requireAdmin();

  const { isLegacyDiskMediaUrl, publicUrlForStoredFile } = await import("@/lib/uploads");

  const media = await prisma.productMedia.findMany({
    select: { id: true, url: true, product: { select: { slug: true } } },
  });

  let linked = 0;
  let stillMissing = 0;

  for (const row of media) {
    if (!isLegacyDiskMediaUrl(row.url)) continue;

    const pathPart = row.url
      .replace(/^\/uploads\//, "")
      .replace(/^\/api\/media\//, "");
    const parts = pathPart.split("/").filter(Boolean);
    const filename = parts.join("/");
    const basename = parts[parts.length - 1] || "";

    const stored = await prisma.storedFile.findFirst({
      where: {
        OR: [
          { filename },
          { filename: { endsWith: `/${basename}` } },
          { filename: basename },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!stored) {
      stillMissing += 1;
      continue;
    }

    await prisma.productMedia.update({
      where: { id: row.id },
      data: { url: publicUrlForStoredFile(stored.id) },
    });
    linked += 1;
  }

  bustCatalogCache();
  redirect(
    `/admin/products?mediaRepair=1&linked=${linked}&missing=${stillMissing}`,
  );
}
