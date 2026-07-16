import { cn } from '@/lib/utils';

type VendorBrandBadgeProps = {
  brand?: string | null;
  brandLogoUrl?: string | null;
  className?: string;
  logoClassName?: string;
  showName?: boolean;
};

export function VendorBrandBadge({
  brand,
  brandLogoUrl,
  className,
  logoClassName,
  showName = true,
}: VendorBrandBadgeProps) {
  if (!brandLogoUrl && !brand) return null;

  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl}
          alt={brand ? `${brand} logo` : 'Brand logo'}
          loading="lazy"
          decoding="async"
          className={cn(
            'size-5 shrink-0 rounded-full border border-black/10 bg-white object-contain p-0.5',
            logoClassName,
          )}
        />
      ) : null}
      {showName && brand ? (
        <span className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {brand}
        </span>
      ) : null}
    </div>
  );
}
