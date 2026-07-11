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
  const [view, setView] = useState<ProductView>('ITEMS');
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
      <section className="px-4 pb-7 pt-8">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.24em] text-muted">NEW EDIT</p>
        <h1 className="font-serif text-[56px] leading-[0.86] tracking-[-0.07em]">
          Useful clothes,
          <br />
          nothing loud.
        </h1>
        <p className="mt-5 max-w-[310px] text-sm leading-6 text-muted">
          rep.markets is a small fashion storefront for disciplined silhouettes, daily materials, and quiet accessories.
        </p>
      </section>
      <CategoryNav value={category} onChange={changeCategory} />
      <ViewToggle value={view} onChange={changeView} />
      <SearchOverlay products={mockProducts} />
      <ProductGrid products={products} view={view} />
      {products.length ? (
        <div className="px-4 pb-12">
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
    </main>
  );
}
