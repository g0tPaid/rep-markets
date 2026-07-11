import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProduct } from "@/app/admin/actions/products";
import { ProductForm } from "@/app/admin/products/product-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireAdmin();

  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { media: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const productForForm = {
    ...product,
    sizes: Array.isArray(product.sizes) ? (product.sizes as string[]) : [],
    colors: Array.isArray(product.colors) ? (product.colors as string[]) : [],
    tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
    qualityPrices:
      product.qualityPrices && typeof product.qualityPrices === "object" && !Array.isArray(product.qualityPrices)
        ? (product.qualityPrices as Record<string, number | null>)
        : {},
    weight: product.weight ?? null,
    media: product.media.map((item) => ({
      url: item.url,
      kind: item.kind,
      sortOrder: item.sortOrder,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-black/55 underline underline-offset-4">
          Back to products
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Edit product</h1>
      </div>
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentName: category.parent?.name ?? null,
        }))}
        product={productForForm}
        submitLabel="Save product"
      />
    </div>
  );
}
