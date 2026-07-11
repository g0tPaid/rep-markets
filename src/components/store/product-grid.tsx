'use client';

import { motion } from 'framer-motion';
import type { StoreProduct } from '@/lib/products';
import { ProductCard } from '@/components/store/product-card';

type ProductGridProps = {
  products: Array<StoreProduct & { image?: string }>;
};

export function ProductGrid({ products }: ProductGridProps) {
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

  return (
    <motion.section layout className="grid grid-cols-3 gap-x-1.5 gap-y-2.5 px-2 pb-16">
      {products.map((product) => (
        <motion.div
          layout
          key={product.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.section>
  );
}
