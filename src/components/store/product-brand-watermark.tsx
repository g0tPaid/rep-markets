/** Diagonal “confidential”-style watermark for product pages. */
export function ProductBrandWatermark() {
  const rows = Array.from({ length: 14 }, (_, i) => i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none"
    >
      <div className="absolute left-1/2 top-1/2 flex w-[220%] -translate-x-1/2 -translate-y-1/2 -rotate-45 flex-col gap-10 opacity-[0.07]">
        {rows.map((row) => (
          <div
            key={row}
            className="flex whitespace-nowrap"
            style={{ marginLeft: row % 2 === 0 ? '0' : '4.5rem' }}
          >
            {cols.map((col) => (
              <span
                key={`${row}-${col}`}
                className="px-6 font-serif text-[22px] font-bold tracking-[-0.02em] text-black"
              >
                www.rep.markets
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Red brand mark — same as header, slightly smaller. */
export function ProductBrandMark({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-center font-serif text-[18px] font-bold leading-none tracking-[-0.03em] text-red-600 ${className}`}
      style={{ color: '#DC2626' }}
    >
      www.rep.markets
    </p>
  );
}
