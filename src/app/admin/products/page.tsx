import Link from "next/link";

import {
  deleteProduct,
  moveFeaturedProduct,
  repairFeaturedSlots,
  repairLegacyMediaLinks,
  toggleFeaturedProduct,
  toggleFreeShipping,
  toggleProductSale,
} from "@/app/admin/actions/products";
import { requireAdmin } from "@/lib/auth";
import {
  catalogLineFromCategory,
  MAX_FEATURED_PER_LINE,
  type CatalogLine,
} from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { isLegacyDiskMediaUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const LINE_LABEL: Record<CatalogLine, string> = {
  REP: "REP",
  NON_REP: "NON-REP",
};

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: string;
    featuredError?: string;
    line?: string;
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
  await repairFeaturedSlots();

  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const sort = params?.sort === "price-asc" || params?.sort === "price-desc" ? params.sort : "newest";
  const listQuery = new URLSearchParams();
  if (query) listQuery.set("q", query);
  if (sort !== "newest") listQuery.set("sort", sort);
  const listReturnTo = `/admin/products${listQuery.toString() ? `?${listQuery}` : ""}`;
  const featuredError = params?.featuredError;
  const limitedLine =
    params?.line === "NON_REP" || params?.line === "REP" ? (params.line as CatalogLine) : null;
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
    freeShipping: true,
    stock: true,
    status: true,
    featured: true,
    homepageOrder: true,
    category: {
      select: {
        name: true,
        slug: true,
        parent: { select: { name: true, slug: true } },
      },
    },
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

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "price-asc") return Number(a.price) - Number(b.price);
    if (sort === "price-desc") return Number(b.price) - Number(a.price);
    return 0; // newest already from query order
  });

  const featuredByLine: Record<CatalogLine, typeof featuredProducts> = {
    REP: featuredProducts.filter((product) => catalogLineFromCategory(product.category) === "REP"),
    NON_REP: featuredProducts.filter(
      (product) => catalogLineFromCategory(product.category) === "NON_REP",
    ),
  };

  const brokenProductIds = new Set(
    mediaRows.filter((row) => isLegacyDiskMediaUrl(row.url)).map((row) => row.productId),
  );
  const brokenImageCount = brokenProductIds.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-black/45">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold">Products</h1>
          <p className="mt-2 text-sm text-black/55">
            Homepage featured: REP {featuredByLine.REP.length}/{MAX_FEATURED_PER_LINE} · NON-REP{" "}
            {featuredByLine.NON_REP.length}/{MAX_FEATURED_PER_LINE} — manage slots below, then add from
            the list
          </p>
        </div>
        <Link href="/admin/products/new" className="bg-black px-4 py-2 text-sm font-medium text-white">
          New product
        </Link>
      </div>

      {featuredError === "limit" ? (
        <div className="border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">
          All {MAX_FEATURED_PER_LINE} {limitedLine ? LINE_LABEL[limitedLine] : ""} featured slots are
          full. Remove one from that line&apos;s slots above, then feature another.
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

      {(["REP", "NON_REP"] as CatalogLine[]).map((line) => {
        const lineFeatured = featuredByLine[line];
        const featuredCount = lineFeatured.length;
        const featuredSlots = Array.from({ length: MAX_FEATURED_PER_LINE }, (_, index) => {
          return lineFeatured[index] ?? null;
        });
        const title =
          line === "REP" ? "Homepage featured slots" : "NON-REP featured slots";
        const blurb =
          line === "REP"
            ? `Fixed ${MAX_FEATURED_PER_LINE} spots for the REP homepage tab. Remove frees a slot. Numbers always stay 1–${featuredCount || 0} in order.`
            : `Fixed ${MAX_FEATURED_PER_LINE} spots for the NON-REP homepage tab. Remove frees a slot. Numbers always stay 1–${featuredCount || 0} in order.`;

        return (
          <section key={line} className="border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-black/55">{blurb}</p>
              </div>
              <p className="text-sm font-medium text-black/70">
                {featuredCount} filled · {MAX_FEATURED_PER_LINE - featuredCount} open
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredSlots.map((product, index) => {
                const slot = index + 1;
                if (!product) {
                  return (
                    <div
                      key={`${line}-empty-${slot}`}
                      className="flex min-h-[108px] flex-col justify-between border border-dashed border-black/20 bg-neutral-50 px-4 py-3"
                    >
                      <p className="text-xs font-semibold tracking-[0.16em] text-black/40">
                        SLOT {slot}
                      </p>
                      <p className="text-sm text-black/45">Empty — use Featured in the list</p>
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
        );
      })}

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/admin/products">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, slug, or SKU"
          className="w-full border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          aria-label="Sort products"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <button className="border border-black px-4 py-2 text-sm font-medium" type="submit">
          Apply
        </button>
      </form>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sortedProducts.map((product) => {
            const thumb = product.media[0]?.url;
            const line = catalogLineFromCategory(product.category);
            const lineFeatured = featuredByLine[line];
            const slot = product.featured
              ? lineFeatured.findIndex((item) => item.id === product.id) + 1
              : 0;
            const needsPhoto = brokenProductIds.has(product.id);
            const onSale =
              typeof product.salePrice === "number" &&
              Number.isFinite(product.salePrice) &&
              product.salePrice > 0 &&
              product.salePrice < product.price;
            return (
              <article
                key={product.id}
                className={`overflow-hidden border bg-white ${
                  product.featured ? "border-emerald-600/40" : "border-black/10"
                }`}
              >
                <div className="relative aspect-[3/4] bg-neutral-100">
                  {thumb && !needsPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={product.media[0]?.alt || product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-red-700">
                      NO IMG
                    </div>
                  )}
                  {onSale ? (
                    <span className="pointer-events-none absolute -left-7 top-3 w-28 -rotate-45 bg-red-600 py-1 text-center text-[8px] font-bold uppercase tracking-[0.14em] text-white shadow">
                      Sale
                    </span>
                  ) : null}
                  {product.freeShipping ? (
                    <span className="absolute bottom-2 left-2 bg-black/85 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-white">
                      Free ship
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
                    <p className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-black/45">
                      {LINE_LABEL[line]} · {product.category?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <p className="text-sm">
                    {onSale ? (
                      <>
                        <span className="font-semibold text-emerald-700">{money(product.salePrice)}</span>{" "}
                        <span className="text-black/40 line-through">{money(product.price)}</span>
                      </>
                    ) : (
                      <span className="font-semibold">{money(product.price)}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-black/50">
                    Stock {product.stock} · {product.status}
                  </p>
                  <form action={toggleProductSale}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="returnTo" value={listReturnTo} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 text-left text-xs"
                      aria-pressed={onSale}
                    >
                      <span
                        className={`grid size-3.5 place-items-center border ${
                          onSale ? "border-red-600 bg-red-600 text-white" : "border-black/30 bg-white"
                        }`}
                        aria-hidden
                      >
                        {onSale ? "✓" : ""}
                      </span>
                      On sale (−10%)
                    </button>
                  </form>
                  <form action={toggleFreeShipping}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="returnTo" value={listReturnTo} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 text-left text-xs"
                      aria-pressed={product.freeShipping}
                    >
                      <span
                        className={`grid size-3.5 place-items-center border ${
                          product.freeShipping
                            ? "border-black bg-black text-white"
                            : "border-black/30 bg-white"
                        }`}
                        aria-hidden
                      >
                        {product.freeShipping ? "✓" : ""}
                      </span>
                      Free shipping
                    </button>
                  </form>
                  <form action={toggleFeaturedProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="submit"
                      className={
                        product.featured
                          ? "w-full bg-emerald-600 px-2 py-1.5 text-[10px] font-semibold tracking-[0.1em] text-white"
                          : "w-full border border-black/20 px-2 py-1.5 text-[10px] font-semibold tracking-[0.1em] hover:border-black"
                      }
                    >
                      {product.featured ? `FEATURED #${slot}` : "ADD TO FEATURED"}
                    </button>
                  </form>
                  <div className="flex gap-3 pt-1 text-xs">
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
                </div>
              </article>
            );
          })}
        </div>
        {!sortedProducts.length ? (
          <p className="border border-black/10 bg-white p-5 text-sm text-black/55">
            No products found. Create your first rep.markets product to start the catalog.
          </p>
        ) : null}
      </section>
    </div>
  );
}
