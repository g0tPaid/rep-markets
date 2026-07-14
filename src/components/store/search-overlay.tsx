'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { StoreProduct } from '@/lib/products';
import { normalDisplayPrice } from '@/lib/products';
import { formatPrice } from '@/lib/utils';

type SearchOverlayProps = {
  products: StoreProduct[];
};

export function SearchOverlay({ products }: SearchOverlayProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products.slice(0, 4);

    return products
      .filter((product) =>
        [product.name, product.category, product.description, product.material, ...product.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 8);
  }, [products, query]);

  return (
    <>
      <div className="px-4 pb-4 pt-3.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between border border-hairline px-4 py-3 text-left text-[11px] uppercase tracking-[0.18em] text-muted"
        >
          Search rep.markets
          <Search className="size-4" />
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-40 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mx-auto flex min-h-screen max-w-[428px] flex-col bg-white">
              <div className="flex items-center gap-3 border-b border-hairline px-4 py-4">
                <Search className="size-4" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, category, material"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
                <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center" aria-label="Close search">
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6">
                <p className="mb-5 text-[11px] font-semibold tracking-[0.22em] text-muted">
                  {query ? 'RESULTS' : 'SUGGESTED'}
                </p>
                {results.length ? (
                  <div className="space-y-3">
                    {results.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        onClick={() => setOpen(false)}
                        className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-hairline pb-3"
                      >
                        <span
                          className="aspect-[3/4] bg-surface bg-cover bg-center"
                          style={{ backgroundImage: `url("${product.images[0]}")` }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium uppercase tracking-[0.12em]">{product.name}</span>
                          <span className="mt-1 block text-xs text-muted">{product.category}</span>
                        </span>
                        <span className="text-xs">{formatPrice(normalDisplayPrice(product))}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="pt-20 text-center">
                    <p className="font-serif text-3xl tracking-[-0.04em]">No excess found.</p>
                    <p className="mt-3 text-sm text-muted">Try a category, material, or product name.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
