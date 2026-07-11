"use server";

import { revalidatePath } from "next/cache";

import { CouponType } from "@/generated/prisma";
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

function optionalDate(formData: FormData, key: string) {
  const field = value(formData, key);
  return field ? new Date(`${field}T23:59:59`) : null;
}

export async function createCoupon(formData: FormData) {
  await requireAdmin();
  await prisma.coupon.create({
    data: {
      code: value(formData, "code").toUpperCase(),
      type: value(formData, "type") as CouponType,
      value: Number(value(formData, "value")) || 0,
      expiresAt: optionalDate(formData, "expiresAt"),
      usageLimit: optionalNumber(formData, "usageLimit"),
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin/coupons");
}

export async function updateCoupon(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.coupon.update({
    where: { id },
    data: {
      code: value(formData, "code").toUpperCase(),
      type: value(formData, "type") as CouponType,
      value: Number(value(formData, "value")) || 0,
      expiresAt: optionalDate(formData, "expiresAt"),
      usageLimit: optionalNumber(formData, "usageLimit"),
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await prisma.coupon.delete({
    where: { id },
  });

  revalidatePath("/admin/coupons");
}
