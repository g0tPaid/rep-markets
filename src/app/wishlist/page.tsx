'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/store/header';
import { ProductGrid } from '@/components/store/product-grid';
import type { StoreProduct } from '@/lib/products';
import { useWishlist } from '@/lib/store';

export default function WishlistPage() {
  const ids = useWishlist((state) => state.ids);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ids.length) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ ids: ids.join(',') });

    fetch(`/api/products?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: { data?: StoreProduct[] }) => {
        if (!cancelled) setProducts(payload.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ids, mounted]);

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="px-4 py-8">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.24em] text-muted">WISHLIST</p>
        <h1 className="font-serif text-[54px] leading-[0.9] tracking-[-0.07em]">Things worth keeping.</h1>
      </section>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <section className="px-4 py-16 text-center">
          <p className="font-serif text-3xl tracking-[-0.04em]">No saved things yet.</p>
          <p className="mx-auto mt-4 max-w-[260px] text-sm leading-6 text-muted">
            Tap the heart on an item to keep a shorter list of what matters.
          </p>
          <Link href="/" className="mt-8 inline-block border border-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em]">
            SHOP THE EDIT
          </Link>
        </section>
      )}
    </main>
  );
}
