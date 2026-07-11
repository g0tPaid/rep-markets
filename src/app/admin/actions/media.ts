"use server";

import { revalidatePath } from "next/cache";

import { MediaType } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string) {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim() : "";
}

function optionalNumber(formData: FormData, key: string) {
  const field = value(formData, key);

  if (!field) {
    return null;
  }

  const parsed = Number(field);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createMediaAsset(formData: FormData) {
  await requireAdmin();
  await prisma.mediaAsset.create({
    data: {
      url: value(formData, "url"),
      publicId: value(formData, "publicId") || null,
      type: (value(formData, "type") as MediaType) || "IMAGE",
      folder: value(formData, "folder") || "uploads",
      name: value(formData, "name") || null,
      width: optionalNumber(formData, "width"),
      height: optionalNumber(formData, "height"),
    },
  });

  revalidatePath("/admin/media");
}

export async function deleteMediaAsset(id: string) {
  await requireAdmin();
  await prisma.mediaAsset.delete({
    where: { id },
  });

  revalidatePath("/admin/media");
}
