import Link from "next/link";

import { deleteProduct } from "@/app/admin/actions/products";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function money(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  await requireAdmin();

  const query = (await searchParams)?.q?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-black/45">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold">Products</h1>
        </div>
        <Link href="/admin/products/new" className="bg-black px-4 py-2 text-sm font-medium text-white">
          New product
        </Link>
      </div>

      <form className="flex gap-2" action="/admin/products">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, slug, or SKU"
          className="w-full border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button className="border border-black px-4 py-2 text-sm font-medium" type="submit">
          Search
        </button>
      </form>

      <section className="overflow-hidden border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-black/10 bg-neutral-50 text-black/55">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium">{product.name}</div>
                    <div className="mt-1 text-xs text-black/50">{product.sku ?? product.slug}</div>
                  </td>
                  <td className="px-4 py-4">{product.category?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-4">
                    {product.salePrice ? (
                      <span>
                        {money(product.salePrice)}{" "}
                        <span className="text-black/40 line-through">{money(product.price)}</span>
                      </span>
                    ) : (
                      money(product.price)
                    )}
                  </td>
                  <td className="px-4 py-4">{product.stock}</td>
                  <td className="px-4 py-4">{product.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/products/edit/${product.id}`} className="underline underline-offset-4">
                        Edit
                      </Link>
                      <form action={deleteProduct.bind(null, product.id)}>
                        <button className="text-red-700 underline underline-offset-4" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!products.length ? (
          <p className="border-t border-black/10 p-5 text-sm text-black/55">
            No products found. Create your first rep.things product to start the catalog.
          </p>
        ) : null}
      </section>
    </div>
  );
}
