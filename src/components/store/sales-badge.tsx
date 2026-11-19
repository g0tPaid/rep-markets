import React from 'react';
import type { StoreProduct } from '@/lib/products';

/** Counts reflect recorded paid/fulfilled order items, not views or estimates. */
export function SalesBadge({ product }: { product: Pick<StoreProduct, 'soldCount' | 'catalogPreview'> }) {
  const count = product.soldCount ?? 0;
  if (count > 0) return <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800" title="Verified paid or fulfilled units recorded by rep.markets">{count.toLocaleString('en-US')} sold</span>;
  if (product.catalogPreview) return <span className="inline-flex w-fit rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800">New preview</span>;
  return null;
}
