"use server";

import { revalidatePath } from "next/cache";

import { OrderStatus } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateOrderStatus(id: string, formData: FormData) {
  await requireAdmin();
  const status = formData.get("status");

  if (typeof status !== "string") {
    return;
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
