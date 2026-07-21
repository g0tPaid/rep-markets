'use client';

import type { StoreProduct } from '@/lib/products';
import { ProductCard } from '@/components/store/product-card';
import { ProductBrandMark } from '@/components/store/product-brand-watermark';

type ProductGridProps = {
  products: Array<StoreProduct & { image?: string }>;
  /** Insert www.rep.markets after this many products (full-width row). */
  brandAfter?: number;
};

export function ProductGrid({ products, brandAfter = 3 }: ProductGridProps) {
  if (!products.length) {
    return (
      <section className="px-4 py-16 text-center">
        <p className="font-serif text-3xl leading-none tracking-[-0.04em]">Nothing unnecessary.</p>
        <p className="mx-auto mt-4 max-w-[260px] text-sm leading-6 text-muted">
          This edit is being prepared. Check back soon for a smaller, better selection.
        </p>
      </section>
    );
  }

  const showBrand = brandAfter > 0 && products.length > brandAfter;
  const head = showBrand ? products.slice(0, brandAfter) : products;
  const tail = showBrand ? products.slice(brandAfter) : [];

  return (
    <section className="grid grid-cols-3 gap-x-1.5 gap-y-2.5 px-2 pb-16">
      {head.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 6} />
      ))}
      {showBrand ? (
        <div className="col-span-3 flex items-center justify-center py-3">
          <ProductBrandMark className="text-center text-[22px] sm:text-[24px]" />
        </div>
      ) : null}
      {tail.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={head.length + index < 6}
        />
      ))}
    </section>
  );
}
