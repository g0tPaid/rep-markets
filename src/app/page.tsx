'use client';

import { useMemo, useState } from 'react';
import { CategoryNav } from '@/components/store/category-nav';
import { Header } from '@/components/store/header';
import { OffersBanner } from '@/components/store/offers-banner';
import { ProductGrid } from '@/components/store/product-grid';
import { SearchOverlay } from '@/components/store/search-overlay';
import { ViewToggle } from '@/components/store/view-toggle';
import { filterProducts, mockProducts, type ProductCategory, type ProductView } from '@/lib/products';

const FEED_PAGES = 3;

export default function Home() {
  const [category, setCategory] = useState<ProductCategory>('ALL');
  const [view, setView] = useState<ProductView>('REPS');
  const [page, setPage] = useState(1);

  const products = useMemo(() => {
    const filtered = filterProducts(mockProducts, category, view);
    return Array.from({ length: page }, (_, index) =>
      filtered.map((product) => ({
        ...product,
        id: index === 0 ? product.id : `${product.id}-${index}`,
      })),
    ).flat();
  }, [category, page, view]);

  function changeCategory(nextCategory: ProductCategory) {
    setCategory(nextCategory);
    setPage(1);
  }

  function changeView(nextView: ProductView) {
    setView(nextView);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <OffersBanner />
      <section className="px-4 pb-7 pt-4">
        <h1 className="text-center font-serif text-[44px] leading-[0.95] tracking-[-0.05em]">
          everything.
          <br />
          straightforward
        </h1>
        <p className="mx-auto mt-6 w-fit border border-black/15 bg-surface px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/70">
          Warehouses and offices in China and Dubai
        </p>
        <aside
          role="note"
          aria-label="Shipping time notice"
          className="mx-auto mt-5 w-full max-w-[280px] border border-red-600 bg-red-50 px-2.5 py-2.5 text-center text-red-700"
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em]">⚠ Shipping notice</p>
          <p className="mt-1.5 text-[10px] leading-4">
            See, these factories are located in villages. We source directly from factories. When they
            send an item, it takes 2 to 3 days to reach us. Then we send you QC videos — that takes 1
            day. Shipping takes another 2 days, and then usually it takes 9 to 14 days to reach your
            place.
          </p>
          <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.06em]">
            This is true numbers and no overpromises.
          </p>
        </aside>
      </section>
      <CategoryNav value={category} onChange={changeCategory} />
      <ViewToggle value={view} onChange={changeView} />
      <SearchOverlay products={mockProducts} />
      <ProductGrid products={products} view={view} />
      {products.length ? (
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, FEED_PAGES))}
            disabled={page >= FEED_PAGES}
            className="w-full border border-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em] disabled:border-hairline disabled:text-muted"
          >
            {page >= FEED_PAGES ? 'END OF EDIT' : 'LOAD MORE'}
          </button>
        </div>
      ) : null}
      <section className="border-t border-hairline px-4 pb-12 pt-8">
        <p className="text-center text-sm leading-6 text-muted">
          Can&apos;t find the thing you&apos;re looking for?
        </p>
        <a
          href="https://wa.me/8618059262730?text=Hi%20AJ%2C%20I%20can%27t%20find%20what%20I%27m%20looking%20for%20on%20rep.markets"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center border border-[#25D366] bg-[#25D366] px-5 py-4 text-center text-[11px] font-semibold tracking-[0.14em] text-white"
        >
          Message us on WhatsApp
        </a>
      </section>
    </main>
  );
}
