"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { ProductStatus } from "@/generated/prisma";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage } from "@/lib/uploads";

export type ProductActionState = {
  error?: string;
};

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
    stock: numberValue(formData, "stock"),
    sizes: csvValue(formData, "sizes"),
    colors: csvValue(formData, "colors"),
    tags: csvValue(formData, "tags"),
    weight: optionalNumber(formData, "weight"),
    material: optionalString(formData, "material"),
    status: (stringValue(formData, "status") || "ACTIVE") as ProductStatus,
    featured: formData.get("featured") === "on",
    newArrival: formData.get("newArrival") === "on",
    homepageOrder: optionalNumber(formData, "homepageOrder"),
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
    const product = await prisma.product.create({
      data,
    });

    await replaceProductMedia(product.id, formData);
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
    await prisma.product.update({
      where: { id },
      data,
    });

    await replaceProductMedia(id, formData);
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

const MAX_FEATURED = 6;

export async function toggleFeaturedProduct(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  if (!id) return;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, featured: true, slug: true },
  });

  if (!product) return;

  if (product.featured) {
    await prisma.product.update({
      where: { id },
      data: { featured: false, homepageOrder: null },
    });
    bustCatalogCache(product.slug);
    redirect("/admin/products");
  }

  const featuredCount = await prisma.product.count({ where: { featured: true } });
  if (featuredCount >= MAX_FEATURED) {
    redirect("/admin/products?featuredError=limit");
  }

  await prisma.product.update({
    where: { id },
    data: { featured: true, homepageOrder: featuredCount + 1 },
  });

  bustCatalogCache(product.slug);
  redirect("/admin/products");
}
