import { qualityPriceRange } from '@/lib/products';
import { cn, formatPrice } from '@/lib/utils';

type QualityPriceRangeProps = {
  product: {
    price: number;
    salePrice?: number | null;
    qualityPrices?: Parameters<typeof qualityPriceRange>[0]['qualityPrices'];
  };
  className?: string;
  /** Larger size for Normal (low) price */
  normalClassName?: string;
  /** Smaller size for high-tier price */
  highClassName?: string;
  separatorClassName?: string;
};

/** Normal (low) price is emphasized; high-tier price stays smaller. */
export function QualityPriceRange({
  product,
  className,
  normalClassName = 'text-sm font-semibold',
  highClassName = 'text-[10px] font-medium opacity-70',
  separatorClassName = 'text-[10px] opacity-50',
}: QualityPriceRangeProps) {
  const { low, high } = qualityPriceRange(product);
  const same = Math.abs(high - low) < 0.01;

  if (same) {
    return (
      <span className={cn('inline-flex items-baseline justify-center gap-1', className)}>
        <span className={normalClassName}>{formatPrice(low)}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-baseline justify-center gap-1', className)}>
      <span className={normalClassName}>{formatPrice(low)}</span>
      <span className={separatorClassName} aria-hidden>
        –
      </span>
      <span className={highClassName}>{formatPrice(high)}</span>
    </span>
  );
}
