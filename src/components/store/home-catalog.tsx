'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/store/header';
import { OffersBanner } from '@/components/store/offers-banner';
import { ProductBrandWatermark } from '@/components/store/product-brand-watermark';
import { ProductGrid } from '@/components/store/product-grid';
import { SearchOverlay } from '@/components/store/search-overlay';
import { ViewToggle } from '@/components/store/view-toggle';
import {
  filterProducts,
  type ProductView,
  type StoreProduct,
} from '@/lib/products';

const PAGE_SIZE = 12;
const SwipeCatalog = dynamic(() => import('@/components/store/swipe-catalog').then((module) => module.SwipeCatalog), { loading: () => <p className="px-4 py-12 text-center text-sm text-muted">Loading swipe catalog…</p> });

type HomeCatalogProps = {
  initial: Record<ProductView, StoreProduct[]>;
  totals: Record<ProductView, number>;
  gtaCategories: [string, string][];
};

export function HomeCatalog({ initial, totals, gtaCategories }: HomeCatalogProps) {
  const [view, setView] = useState<ProductView>('REPS');
  const [gtaCategory, setGtaCategory] = useState('ALL');
  const [layout, setLayout] = useState<'grid' | 'swipe'>('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shippingNoticeOpen, setShippingNoticeOpen] = useState(true);
  const [fullCatalog, setFullCatalog] = useState<Partial<Record<ProductView, StoreProduct[]>>>({});
  const [busy, setBusy] = useState<Partial<Record<ProductView, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ProductView, boolean>>>({});
  const requests = useRef<Partial<Record<ProductView, Promise<void>>>>({});
  const catalogReady = Boolean(fullCatalog[view]) || initial[view].length >= totals[view];
  const catalog = fullCatalog[view] ?? initial[view];

  function ensureCatalog(target: ProductView) {
    if (fullCatalog[target] || initial[target].length >= totals[target]) return Promise.resolve();
    if (requests.current[target]) return requests.current[target];
    setBusy((current) => ({ ...current, [target]: true }));
    setErrors((current) => ({ ...current, [target]: false }));
    const request = fetch(`/api/products?view=${target}&all=1`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load catalog');
        const result = await response.json();
        if (!Array.isArray(result.data)) throw new Error('Invalid catalog response');
        setFullCatalog((current) => ({ ...current, [target]: result.data }));
      })
      .catch(() => setErrors((current) => ({ ...current, [target]: true })))
      .finally(() => {
        delete requests.current[target];
        setBusy((current) => ({ ...current, [target]: false }));
      });
    requests.current[target] = request;
    return request;
  }

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

  const filtered = useMemo(() => {
    return filterProducts(catalog, view === 'GTA_6' ? gtaCategory : 'ALL', view)
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
  }, [catalog, view, gtaCategory]);

  const products = filtered.slice(0, visibleCount);
  const hasMore = catalogReady ? visibleCount < filtered.length : initial[view].length < totals[view];
  const waitingForOptions = !catalogReady && (layout === 'swipe' || (view === 'GTA_6' && gtaCategory !== 'ALL'));

  function changeView(nextView: ProductView) {
    setView(nextView);
    setGtaCategory('ALL');
    setVisibleCount(PAGE_SIZE);
    if (layout === 'swipe') void ensureCatalog(nextView);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <ProductBrandWatermark />
      <div className="relative z-[2]">
      <Header />
      <section className="px-4 pb-3 pt-2">
        <p className="mx-auto max-w-[360px] text-center text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-black/80">
          Warehouse and office in China.
          <br />
          Replies between{' '}
          <span className="font-bold text-red-600">8:00 AM</span> and{' '}
          <span className="font-bold text-red-600">11:00 PM</span> China time.
        </p>
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
      {view === 'GTA_6' && gtaCategories.length > 1 ? (
        <nav aria-label="GTA VI merchandise categories" className="flex gap-2 overflow-x-auto px-4 py-2">
          {([['ALL', 'All merch'], ...gtaCategories] as [string, string][]).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={gtaCategory === key} onClick={() => { setGtaCategory(key); setVisibleCount(PAGE_SIZE); if (key !== 'ALL') void ensureCatalog(view); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${gtaCategory === key ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>{label}</button>
          ))}
        </nav>
      ) : null}
      <OffersBanner />
      <SearchOverlay products={filtered} onOpen={() => { void ensureCatalog(view); }} catalogReady={catalogReady} loading={Boolean(busy[view])} error={Boolean(errors[view])} />
      <div aria-label="Catalog layout" role="group" className="mx-auto mb-2 flex w-fit gap-1 rounded-full bg-surface p-1">
        {(['grid', 'swipe'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={layout === option}
            onClick={() => { setLayout(option); if (option === 'swipe') void ensureCatalog(view); }}
            className={option === 'swipe'
              ? 'catalog-swipe-pill inline-flex min-h-9 items-center gap-2 rounded-full bg-rose-100 px-4 text-xs font-semibold text-rose-800 hover:bg-rose-200 aria-pressed:bg-rose-700 aria-pressed:text-white'
              : 'min-h-9 rounded-full px-4 text-xs font-semibold text-neutral-700 hover:text-neutral-950 aria-pressed:bg-white aria-pressed:text-neutral-950 aria-pressed:shadow-sm'}
          >
            {option === 'swipe' ? <><ArrowLeftRight size={14} aria-hidden /> Swipe</> : 'Grid'}
          </button>
        ))}
      </div>
      {waitingForOptions ? (
        <div className="px-4 py-12 text-center text-sm text-muted">{errors[view] ? <button type="button" className="underline" onClick={() => void ensureCatalog(view)}>Could not load the collection. Try again.</button> : 'Loading collection…'}</div>
      ) : layout === 'swipe' ? (
        <SwipeCatalog key={view} products={filtered} />
      ) : (
        <ProductGrid products={products} />
      )}
      {layout === 'grid' && !waitingForOptions && filtered.length ? (
        <div className="px-4 pb-6">
          {hasMore ? (
            <button
              type="button"
              disabled={Boolean(busy[view])}
              onClick={() => { if (!catalogReady) { void ensureCatalog(view); } if (!errors[view] || catalogReady) setVisibleCount((current) => current + PAGE_SIZE); }}
              className="w-full border border-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em]"
            >
              {busy[view] ? 'LOADING…' : errors[view] ? 'TRY AGAIN' : 'LOAD MORE'}
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
      </div>
    </main>
  );
}

