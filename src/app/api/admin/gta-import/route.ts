import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import {
  GTA_IMPORT_TAG,
  GTA_MAX_IMAGES_PER_PRODUCT,
  gtaCategorySlug,
  isGtaCategory,
  slugifyGta,
  type GtaDraftInput,
} from "@/lib/gta-import";

export const runtime = "nodejs";
const hashPattern = /^[a-f0-9]{64}$/;
const mediaPrefix = "gta-import-sha256-";

function skuFor(hashes: string[]) {
  return (
    "GTA-BULK-" +
    createHash("sha256")
      .update([...hashes].sort().join(":"))
      .digest("hex")
  );
}

function strings(value: unknown, max = 30): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.length <= 120,
    )
  );
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  if (/^\/api\/media\/f\/[a-zA-Z0-9_-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

function validImages(value: unknown): value is GtaDraftInput["images"] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > GTA_MAX_IMAGES_PER_PRODUCT
  )
    return false;
  return (
    value.every(
      (image) =>
        image &&
        typeof image.hash === "string" &&
        hashPattern.test(image.hash) &&
        validUrl(image.url),
    ) && new Set(value.map((i) => i.hash)).size === value.length
  );
}

function validDraft(value: unknown): value is GtaDraftInput {
  if (!value || typeof value !== "object") return false;
  const item = value as GtaDraftInput;
  return (
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    item.name.length <= 160 &&
    isGtaCategory(item.category) &&
    typeof item.description === "string" &&
    item.description.length <= 3000 &&
    (item.price === null ||
      (typeof item.price === "number" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        item.price <= 100000)) &&
    (item.stock === null ||
      (typeof item.stock === "number" &&
        Number.isInteger(item.stock) &&
        item.stock >= 0 &&
        item.stock <= 1000000)) &&
    strings(item.sizes) &&
    strings(item.colors) &&
    strings(item.tags) &&
    validImages(item.images)
  );
}

function invalidate() {
  revalidateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/gta-import");
}

export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const error = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });
  try {
    const body = await request.json();
    if (body.action === "lookup") {
      const hashes: unknown = body.hashes;
      if (
        !Array.isArray(hashes) ||
        !hashes.length ||
        hashes.length > GTA_MAX_IMAGES_PER_PRODUCT ||
        !hashes.every((h) => typeof h === "string" && hashPattern.test(h))
      )
        return error("Invalid image fingerprints.");
      const existing = await prisma.product.findUnique({
        where: { sku: skuFor(hashes) },
        select: { id: true, name: true, status: true },
      });
      const used = existing
        ? null
        : await prisma.productMedia.findFirst({
            where: { publicId: { in: hashes.map((h) => mediaPrefix + h) } },
            select: { product: { select: { name: true } } },
          });
      return NextResponse.json({
        existing,
        conflict: used?.product.name || null,
      });
    }
    if (body.action === "create") {
      const draft: unknown = body.draft;
      if (!validDraft(draft))
        return error(
          "Check the product title, category, price, stock and images.",
        );
      const sku = skuFor(draft.images.map((image) => image.hash));
      const existing = await prisma.product.findUnique({
        where: { sku },
        select: { id: true, name: true, status: true },
      });
      if (existing)
        return NextResponse.json({ product: existing, existing: true });
      const used = await prisma.productMedia.findFirst({
        where: {
          publicId: { in: draft.images.map((i) => mediaPrefix + i.hash) },
        },
        select: { product: { select: { name: true } } },
      });
      if (used)
        return error(
          `One or more photos already belong to ${used.product.name}. Review before importing.`,
          409,
        );
      const product = await prisma.$transaction(async (tx) => {
        const root = await tx.category.upsert({
          where: { slug: "gta-6" },
          update: {},
          create: { slug: "gta-6", name: "GTA 6", isVisible: false },
        });
        const category = await tx.category.upsert({
          where: { slug: gtaCategorySlug(draft.category) },
          update: {},
          create: {
            slug: gtaCategorySlug(draft.category),
            name: draft.category,
            parentId: root.id,
            isVisible: false,
          },
        });
        const name = /\bgta\s*(?:6|vi)\b/i.test(draft.name)
          ? draft.name.trim()
          : `GTA VI ${draft.name.trim()}`;
        const tags = [
          ...new Set([
            "gta 6",
            "gta vi",
            GTA_IMPORT_TAG,
            "flat-price",
            ...(draft.stock === null ? ["gta-import-stock-unconfirmed"] : []),
            ...draft.tags.map((x) => x.trim()),
          ]),
        ];
        const price = draft.price ?? 0;
        return tx.product.create({
          data: {
            name,
            slug: `${slugifyGta(name).slice(0, 120) || "gta-vi-merch"}-${sku.slice(-12)}`,
            sku,
            status: "DRAFT",
            categoryId: category.id,
            price,
            stock: draft.stock ?? 0,
            brand: "rep.markets",
            shortDescription: draft.description.trim().slice(0, 240) || null,
            longDescription: draft.description.trim() || null,
            sizes: draft.sizes,
            colors: draft.colors,
            tags,
            qualityPrices: price
              ? {
                  NORMAL: price,
                  GOOD: price,
                  HIGH: price,
                  ONE_TO_ONE: price,
                  MIRROR: price,
                }
              : {},
            media: {
              create: draft.images.map((image, index) => ({
                url: image.url,
                publicId: mediaPrefix + image.hash,
                alt: `${name} image ${index + 1}`,
                sortOrder: index,
                kind: "ITEM",
              })),
            },
          },
          select: { id: true, name: true, status: true },
        });
      });
      invalidate();
      return NextResponse.json({ product, existing: false });
    }
    if (body.action === "publish" || body.action === "publish-preview" || body.action === "update-drafts") {
      const ids: unknown = body.ids;
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > 500 ||
        !ids.every((id) => typeof id === "string" && id.length <= 100)
      )
        return error("Select up to 500 drafts.");
      const uniqueIds = [...new Set<string>(ids)];
      const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        select: {
          id: true,
          name: true,
          status: true,
          price: true,
          stock: true,
          tags: true,
          sku: true,
          media: { select: { id: true }, take: 1 },
        },
      });
      if (
        products.length !== uniqueIds.length ||
        products.some(
          (p) =>
            p.status !== "DRAFT" ||
            !p.sku?.startsWith("GTA-BULK-") ||
            !Array.isArray(p.tags) ||
            !p.tags.includes(GTA_IMPORT_TAG),
        )
      )
        return error(
          "Only existing GTA bulk-import drafts can be changed. Refresh the list.",
        );
      if (body.action === "update-drafts") {
        const price: unknown = body.price;
        const stock: unknown = body.stock;
        if (
          (price !== null &&
            (typeof price !== "number" ||
              !Number.isFinite(price) ||
              price <= 0 ||
              price > 100000)) ||
          (stock !== null &&
            (typeof stock !== "number" ||
              !Number.isInteger(stock) ||
              stock < 0 ||
              stock > 1000000)) ||
          (price === null && stock === null)
        )
          return error(
            "Enter a positive price, a non-negative whole stock quantity, or both.",
          );
        const result = await prisma.product.updateMany({
          where: {
            id: { in: uniqueIds },
            status: "DRAFT",
            sku: { startsWith: "GTA-BULK-" },
          },
          data: {
            ...(typeof price === "number"
              ? {
                  price,
                  qualityPrices: {
                    NORMAL: price,
                    GOOD: price,
                    HIGH: price,
                    ONE_TO_ONE: price,
                    MIRROR: price,
                  },
                }
              : {}),
            ...(typeof stock === "number" ? { stock } : {}),
          },
        });
        invalidate();
        return NextResponse.json({ updated: result.count });
      }
      // Catalog previews are visible but can never be ordered without a positive price and verified stock.
      // Storefront and checkout each enforce that availability independently.
      if (body.action === "publish-preview") {
        if (products.some((product) => !product.media.length)) return error("Every preview must have at least one photo.");
        const result = await prisma.product.updateMany({
          where: { id: { in: uniqueIds }, status: "DRAFT", sku: { startsWith: "GTA-BULK-" } },
          data: { status: "ACTIVE" },
        });
        invalidate();
        return NextResponse.json({ published: result.count });
      }
      const blocked = products.filter(
        (p) => !(p.price > 0) || !p.media.length || !(p.stock > 0),
      );
      if (blocked.length)
        return error(
          `Confirm positive prices and stock for: ${blocked
            .slice(0, 5)
            .map((p) => p.name)
            .join(
              ", ",
            )}${blocked.length > 5 ? "…" : "."} Edit these products before publishing.`,
        );
      const result = await prisma.product.updateMany({
        where: {
          id: { in: uniqueIds },
          status: "DRAFT",
          sku: { startsWith: "GTA-BULK-" },
          price: { gt: 0 },
          stock: { gt: 0 },
        },
        data: { status: "ACTIVE" },
      });
      invalidate();
      return NextResponse.json({ published: result.count });
    }
    return error("Unknown action.");
  } catch (err) {
    console.error("GTA bulk import error", err);
    return error(
      "Could not finish this request. No existing products were overwritten; refresh and retry.",
      500,
    );
  }
}
