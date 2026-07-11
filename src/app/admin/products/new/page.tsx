import Link from "next/link";

import { createProduct } from "@/app/admin/actions/products";
import { ProductForm } from "@/app/admin/products/product-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parent: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-black/55 underline underline-offset-4">
          Back to products
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">New product</h1>
      </div>
      <ProductForm
        action={createProduct}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentName: category.parent?.name ?? null,
        }))}
        submitLabel="Create product"
      />
    </div>
  );
}
