"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProductStatus } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function productData(formData: FormData) {
  const name = stringValue(formData, "name");
  const slug = stringValue(formData, "slug") || slugify(name);

  return {
    name,
    slug,
    shortDescription: optionalString(formData, "shortDescription"),
    longDescription: optionalString(formData, "longDescription"),
    brand: optionalString(formData, "brand") ?? "rep.markets",
    price: numberValue(formData, "price"),
    salePrice: optionalNumber(formData, "salePrice"),
    sku: optionalString(formData, "sku"),
    stock: numberValue(formData, "stock"),
    sizes: csvValue(formData, "sizes"),
    colors: csvValue(formData, "colors"),
    tags: csvValue(formData, "tags"),
    weight: optionalNumber(formData, "weight"),
    material: optionalString(formData, "material"),
    status: stringValue(formData, "status") as ProductStatus,
    featured: formData.get("featured") === "on",
    newArrival: formData.get("newArrival") === "on",
    homepageOrder: optionalNumber(formData, "homepageOrder"),
    categoryId: optionalString(formData, "categoryId"),
  };
}

async function replaceProductMedia(productId: string, formData: FormData) {
  const itemImageUrl = optionalString(formData, "itemImageUrl");
  const modelImageUrl = optionalString(formData, "modelImageUrl");

  await prisma.productMedia.deleteMany({
    where: { productId },
  });

  const media = [
    itemImageUrl
      ? {
          productId,
          url: itemImageUrl,
          kind: "ITEM",
          alt: `${stringValue(formData, "name")} item image`,
          sortOrder: 0,
        }
      : null,
    modelImageUrl
      ? {
          productId,
          url: modelImageUrl,
          kind: "MODEL",
          alt: `${stringValue(formData, "name")} model image`,
          sortOrder: 1,
        }
      : null,
  ].filter(Boolean);

  if (media.length) {
    await prisma.productMedia.createMany({
      data: media as NonNullable<(typeof media)[number]>[],
    });
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const product = await prisma.product.create({
    data: productData(formData),
  });

  await replaceProductMedia(product.id, formData);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.product.update({
    where: { id },
    data: productData(formData),
  });

  await replaceProductMedia(id, formData);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/edit/${id}`);
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/products");
}
