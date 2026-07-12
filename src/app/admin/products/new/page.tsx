import Link from "next/link";

import { createProduct } from "@/app/admin/actions/products";
import { ProductForm } from "@/app/admin/products/product-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategoryOptions } from "@/lib/admin-categories";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await getAdminCategoryOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-black/55 underline underline-offset-4">
          Back to products
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">New product</h1>
        <p className="mt-2 text-sm text-black/55">
          Pick a leaf under <span className="font-medium text-black">REP</span> or{" "}
          <span className="font-medium text-black">NON-REP</span>. Hidden categories still appear here
          so you can assign products; Visible only controls the homepage pills.
        </p>
      </div>
      <ProductForm
        action={createProduct}
        categories={categories}
        submitLabel="Create product"
      />
    </div>
  );
}
