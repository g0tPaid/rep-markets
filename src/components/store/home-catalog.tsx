'use client';

import { useEffect, useMemo, useState } from 'react';
import { CategoryNav } from '@/components/store/category-nav';
import { Header } from '@/components/store/header';
import { OffersBanner } from '@/components/store/offers-banner';
import { ProductGrid } from '@/components/store/product-grid';
import { SearchOverlay } from '@/components/store/search-overlay';
import { ViewToggle } from '@/components/store/view-toggle';
import {
  filterProducts,
  type ProductCategory,
  type ProductView,
  type StoreNavCategory,
  type StoreProduct,
} from '@/lib/products';

const PAGE_SIZE = 12;

type HomeCatalogProps = {
  products: StoreProduct[];
  navCategories: StoreNavCategory[];
};

export function HomeCatalog({ products: catalog, navCategories }: HomeCatalogProps) {
  const [category, setCategory] = useState<ProductCategory>('ALL');
  const [view, setView] = useState<ProductView>('REPS');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shippingNoticeOpen, setShippingNoticeOpen] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('rm-shipping-notice-closed') === '1') {
        setShippingNoticeOpen(false);
      }
    } catch {
      // ignore
    }
  }, []);

  function closeShippingNotice() {
    setShippingNoticeOpen(false);
    try {
      sessionStorage.setItem('rm-shipping-notice-closed', '1');
    } catch {
      // ignore
    }
  }

  const lineCategories = useMemo(() => {
    const line = view === 'NON_REP' ? 'NON_REP' : 'REP';
    return navCategories.filter((item) => item.line === line);
  }, [navCategories, view]);

  useEffect(() => {
    if (category === 'ALL') return;
    const stillValid = lineCategories.some((item) => item.slug === category);
    if (!stillValid) {
      setCategory('ALL');
      setVisibleCount(PAGE_SIZE);
    }
  }, [category, lineCategories]);

  const filtered = useMemo(() => {
    return filterProducts(catalog, category, view)
      .slice()
      .sort((a, b) => {
        const aFeatured = Boolean(a.featured);
        const bFeatured = Boolean(b.featured);
        if (aFeatured && bFeatured) {
          return (a.homepageOrder ?? 999) - (b.homepageOrder ?? 999);
        }
        if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
        return 0;
      });
  }, [catalog, category, view]);

  const products = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function changeCategory(nextCategory: ProductCategory) {
    setCategory(nextCategory);
    setVisibleCount(PAGE_SIZE);
  }

  function changeView(nextView: ProductView) {
    setView(nextView);
    setCategory('ALL');
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <OffersBanner />
      <section className="px-4 pb-3 pt-2">
        <h1 className="text-center font-serif text-[44px] leading-[0.95] tracking-[-0.05em]">
          Anything
          <br />
          &amp; Everything
        </h1>
        {shippingNoticeOpen ? (
          <aside
            role="note"
            aria-label="Shipping time notice"
            className="relative mx-auto mt-3 w-full max-w-[360px] border border-red-600 bg-red-50 px-3 py-2 pr-9 text-center text-red-700"
          >
            <button
              type="button"
              onClick={closeShippingNotice}
              aria-label="Close shipping notice"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center text-red-700 hover:bg-red-100"
            >
              <span aria-hidden className="text-base leading-none">
                ×
              </span>
            </button>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em]">⚠ Shipping notice</p>
            <p className="mt-1 text-[10px] leading-4">
              See, these factories are located in villages. We source directly from factories. When they
              send an item, it takes 2 to 3 days to reach us. Then we send you QC videos — that takes 1
              day. Shipping takes another 2 days, and then usually it takes 9 to 14 days to reach your
              place.
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.06em]">
              This is true numbers and no overpromises.
            </p>
            <button
              type="button"
              onClick={closeShippingNotice}
              className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] underline underline-offset-2"
            >
              Close
            </button>
          </aside>
        ) : null}
      </section>
      <ViewToggle value={view} onChange={changeView} />
      <CategoryNav categories={lineCategories} value={category} onChange={changeCategory} />
      <SearchOverlay products={filterProducts(catalog, 'ALL', view)} />
      <ProductGrid products={products} />
      {filtered.length ? (
        <div className="px-4 pb-6">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              className="w-full border border-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em]"
            >
              LOAD MORE
            </button>
          ) : (
            <p className="w-full border border-hairline px-5 py-4 text-center text-[11px] font-semibold tracking-[0.22em] text-muted">
              END OF EDIT
            </p>
          )}
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
        <p className="mx-auto mt-4 max-w-[340px] border border-black/10 bg-white px-4 py-2.5 text-center text-[11px] leading-5 text-black/75">
          There are some hidden coupon codes on this website. Find one, WhatsApp us, and you can get
          up to <span className="font-semibold text-black">50% off</span> — and sometimes{' '}
          <span className="font-semibold text-black">free shipping</span>.
        </p>
      </section>
    </main>
  );
}
