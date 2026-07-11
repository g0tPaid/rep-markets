"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string) {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const field = value(formData, key);
  return field.length ? field : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const name = value(formData, "name");
  const parentId = optionalValue(formData, "parentId");

  await prisma.category.create({
    data: {
      name,
      slug: value(formData, "slug") || slugify(name),
      description: optionalValue(formData, "description"),
      imageUrl: optionalValue(formData, "imageUrl"),
      sortOrder: Number(value(formData, "sortOrder")) || 0,
      isVisible: formData.get("isVisible") === "on",
      parentId,
    },
  });

  revalidatePath("/admin/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin();
  const name = value(formData, "name");
  const parentId = optionalValue(formData, "parentId");

  await prisma.category.update({
    where: { id },
    data: {
      name,
      slug: value(formData, "slug") || slugify(name),
      description: optionalValue(formData, "description"),
      imageUrl: optionalValue(formData, "imageUrl"),
      sortOrder: Number(value(formData, "sortOrder")) || 0,
      isVisible: formData.get("isVisible") === "on",
      parentId: parentId === id ? null : parentId,
    },
  });

  revalidatePath("/admin/categories");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/admin/categories");
}
