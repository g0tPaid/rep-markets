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
  /** Show "From" above the range (product page only) */
  showFrom?: boolean;
};

/** Lowest → highest quality tier prices. */
export function QualityPriceRange({
  product,
  className,
  normalClassName = 'text-sm font-semibold',
  highClassName = 'text-[10px] font-medium opacity-70',
  separatorClassName = 'text-[10px] opacity-50',
  showFrom = false,
}: QualityPriceRangeProps) {
  const { low, high } = qualityPriceRange(product);
  const same = Math.abs(high - low) < 0.01;

  return (
    <span className={cn('inline-flex flex-col items-center gap-0.5', className)}>
      {showFrom ? (
        <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted">From</span>
      ) : null}
      {same ? (
        <span className={cn('inline-flex items-baseline justify-center gap-1', normalClassName)}>
          {formatPrice(low)}
        </span>
      ) : (
        <span className="inline-flex items-baseline justify-center gap-1">
          <span className={normalClassName}>{formatPrice(low)}</span>
          <span className={separatorClassName} aria-hidden>
            –
          </span>
          <span className={highClassName}>{formatPrice(high)}</span>
        </span>
      )}
    </span>
  );
}
