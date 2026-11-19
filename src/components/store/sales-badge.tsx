import React from 'react';
import type { StoreProduct } from '@/lib/products';

/** Online counts and merchant-reported lifetime minimums are separate sources. */
export function SalesBadge({ product }: { product: Pick<StoreProduct, 'soldCount' | 'reportedSalesFloor' | 'catalogPreview'> }) {
  const floor = product.reportedSalesFloor ?? 0;
  if (floor >= 1000) return <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800" title="Merchant-reported lifetime sales, including physical sales">{floor.toLocaleString('en-US')}+ sold</span>;
  const count = product.soldCount ?? 0;
  if (count > 0) return <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800" title="Verified paid or fulfilled units recorded by rep.markets">{count.toLocaleString('en-US')} sold</span>;
  if (product.catalogPreview) return <span className="inline-flex w-fit rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800">New preview</span>;
  return null;
}
