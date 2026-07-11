"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string) {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const field = value(formData, key);
  return field.length ? field : null;
}

export async function updateSettings(formData: FormData) {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      siteName: value(formData, "siteName") || "rep.things",
      logoUrl: optionalValue(formData, "logoUrl"),
      faviconUrl: optionalValue(formData, "faviconUrl"),
      instagramUrl: optionalValue(formData, "instagramUrl"),
      tiktokUrl: optionalValue(formData, "tiktokUrl"),
      whatsappNumber: optionalValue(formData, "whatsappNumber"),
      metaTitle: optionalValue(formData, "metaTitle"),
      metaDescription: optionalValue(formData, "metaDescription"),
      currency: value(formData, "currency") || "USD",
    },
    create: {
      id: "default",
      siteName: value(formData, "siteName") || "rep.things",
      logoUrl: optionalValue(formData, "logoUrl"),
      faviconUrl: optionalValue(formData, "faviconUrl"),
      instagramUrl: optionalValue(formData, "instagramUrl"),
      tiktokUrl: optionalValue(formData, "tiktokUrl"),
      whatsappNumber: optionalValue(formData, "whatsappNumber"),
      metaTitle: optionalValue(formData, "metaTitle"),
      metaDescription: optionalValue(formData, "metaDescription"),
      currency: value(formData, "currency") || "USD",
    },
  });

  revalidatePath("/admin/settings");
}
