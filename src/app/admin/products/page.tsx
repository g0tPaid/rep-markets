import Link from "next/link";

import {
  deleteProduct,
  moveFeaturedProduct,
  repairFeaturedSlots,
  repairLegacyMediaLinks,
  toggleFeaturedProduct,
} from "@/app/admin/actions/products";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLegacyDiskMediaUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MAX_FEATURED = 6;

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    featuredError?: string;
    mediaRepair?: string;
    linked?: string;
    missing?: string;
  }>;
};

function money(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  await requireAdmin();
  // Heal any duplicate / gapped homepageOrder values left in the DB
  await repairFeaturedSlots();

  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const featuredError = params?.featuredError;
  const mediaRepair = params?.mediaRepair;
  const linkedCount = Number(params?.linked || 0);
  const missingCount = Number(params?.missing || 0);

  const productSelect = {
    id: true,
    name: true,
    slug: true,
    sku: true,
    price: true,
    salePrice: true,
    stock: true,
    status: true,
    featured: true,
    homepageOrder: true,
    category: { select: { name: true } },
    media: {
      orderBy: { sortOrder: "asc" as const },
      take: 1,
      select: { url: true, alt: true },
    },
  };

  const [products, featuredProducts, mediaRows] = await Promise.all([
    prisma.product.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: productSelect,
      // Stable list order — featured status does not jump rows around
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.product.findMany({
      where: { featured: true },
      select: productSelect,
      orderBy: [{ homepageOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.productMedia.findMany({
      select: { url: true, productId: true },
    }),
  ]);

  const featuredCount = featuredProducts.length;
  const brokenProductIds = new Set(
    mediaRows.filter((row) => isLegacyDiskMediaUrl(row.url)).map((row) => row.productId),
  );
  const brokenImageCount = brokenProductIds.size;
  const featuredSlots = Array.from({ length: MAX_FEATURED }, (_, index) => {
    return featuredProducts[index] ?? null;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-black/45">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold">Products</h1>
          <p className="mt-2 text-sm text-black/55">
            Homepage featured: {featuredCount}/{MAX_FEATURED} — manage the 6 slots below, then add from the
            list
          </p>
        </div>
        <Link href="/admin/products/new" className="bg-black px-4 py-2 text-sm font-medium text-white">
          New product
        </Link>
      </div>

      {featuredError === "limit" ? (
        <div className="border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">
          All {MAX_FEATURED} featured slots are full. Remove one from a slot above, then feature another.
        </div>
      ) : null}

      {mediaRepair ? (
        <div className="border border-emerald-700/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Media repair finished: relinked {linkedCount} image
          {linkedCount === 1 ? "" : "s"}. {missingCount} still need a manual re-upload (file was lost on
          deploy).
        </div>
      ) : null}

      {brokenImageCount > 0 ? (
        <div className="flex flex-col gap-3 border border-amber-600/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">{brokenImageCount} products</span> still use old disk image
            URLs that Railway wiped. New uploads already use durable DB storage. Open each product and
            re-upload photos, or try auto-relink first.
          </p>
          <form action={repairLegacyMediaLinks}>
            <button
              type="submit"
              className="shrink-0 border border-amber-900/40 bg-white px-3 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              TRY AUTO-RELINK
            </button>
          </form>
        </div>
      ) : null}

      <section className="border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Homepage featured slots</h2>
            <p className="mt-1 text-sm text-black/55">
              Fixed 6 spots. Remove frees a slot. Numbers always stay 1–{featuredCount || 0} in order.
            </p>
          </div>
          <p className="text-sm font-medium text-black/70">
            {featuredCount} filled · {MAX_FEATURED - featuredCount} open
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredSlots.map((product, index) => {
            const slot = index + 1;
            if (!product) {
              return (
                <div
                  key={`empty-${slot}`}
                  className="flex min-h-[108px] flex-col justify-between border border-dashed border-black/20 bg-neutral-50 px-4 py-3"
                >
                  <p className="text-xs font-semibold tracking-[0.16em] text-black/40">SLOT {slot}</p>
                  <p className="text-sm text-black/45">Empty — use Feature in the list</p>
                </div>
              );
            }

            const thumb = product.media[0]?.url;
            return (
              <div
                key={product.id}
                className="flex min-h-[108px] flex-col justify-between border border-emerald-600/30 bg-emerald-50/50 px-4 py-3"
              >
                <div className="flex gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden border border-black/10 bg-white">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={product.media[0]?.alt || product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-black/35">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.16em] text-emerald-800">
                      #{slot}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate text-xs text-black/50">{product.sku ?? product.slug}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moveFeaturedProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={slot === 1}
                      className="border border-black/20 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↑ Up
                    </button>
                  </form>
                  <form action={moveFeaturedProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={slot === featuredCount}
                      className="border border-black/20 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↓ Down
                    </button>
                  </form>
                  <form action={toggleFeaturedProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="submit"
                      className="border border-red-700/40 px-2 py-1 text-xs text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-black/10 bg-neutral-50 text-black/55">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {products.map((product) => {
                const thumb = product.media[0]?.url;
                const slot = product.featured
                  ? featuredProducts.findIndex((item) => item.id === product.id) + 1
                  : 0;
                const needsPhoto = brokenProductIds.has(product.id);
                return (
                  <tr key={product.id} className={product.featured ? "bg-emerald-50/40" : undefined}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden border border-black/10 bg-neutral-100">
                          {thumb && !needsPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={product.media[0]?.alt || product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[9px] text-red-700">
                              NO IMG
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{product.name}</div>
                          <div className="mt-1 truncate text-xs text-black/50">
                            {product.sku ?? product.slug}
                            {needsPhoto ? " · needs re-upload" : ""}
                          </div>
                        </div>
                      </div>
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
                      <form action={toggleFeaturedProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          type="submit"
                          className={
                            product.featured
                              ? "bg-emerald-600 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-white"
                              : "border border-black/20 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] hover:border-black"
                          }
                        >
                          {product.featured ? `IN SLOT #${slot}` : "ADD TO FEATURED"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/products/edit/${product.id}`}
                          className="underline underline-offset-4"
                        >
                          Edit
                        </Link>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <button
                            className="text-red-700 underline underline-offset-4"
                            type="submit"
                            formNoValidate
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!products.length ? (
          <p className="border-t border-black/10 p-5 text-sm text-black/55">
            No products found. Create your first rep.markets product to start the catalog.
          </p>
        ) : null}
      </section>
    </div>
  );
}
