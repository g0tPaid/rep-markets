'use client';

import { motion } from 'framer-motion';
import { type ProductView, VIEW_LABELS, VIEWS } from '@/lib/products';
import { cn } from '@/lib/utils';

type ViewToggleProps = {
  value: ProductView;
  onChange: (view: ProductView) => void;
};

// Exact GTA VI-inspired button chosen by the user, served from our own site.
function GTA6Button({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label="Shop GTA VI merchandise"
      className={cn(
        'group relative flex min-h-[54px] min-w-0 w-full items-center justify-center rounded-[13px] bg-transparent p-0 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d74687] active:scale-[0.98] sm:min-h-[62px]',
        selected
          ? 'drop-shadow-[0_0_7px_rgba(240,48,180,0.52)]'
          : 'hover:brightness-110',
      )}
    >
      {/* Preserve the supplied transparent artwork without cropping or stretching. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/_next/image?url=%2Fimages%2Fgta-vi-merch-artwork.webp&w=384&q=75"
        srcSet="/_next/image?url=%2Fimages%2Fgta-vi-merch-artwork.webp&w=256&q=75 256w, /_next/image?url=%2Fimages%2Fgta-vi-merch-artwork.webp&w=384&q=75 384w"
        sizes="(max-width: 428px) 33vw, 142px"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        draggable={false}
        className="block h-auto max-h-[120px] w-full max-w-[300px] select-none object-contain transition-transform duration-200 group-hover:scale-[1.025]"
      />
    </button>
  );
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="px-4 pb-1.5 pt-0">
      <div className="relative grid grid-cols-3 items-stretch gap-1.5 rounded-[18px] border border-hairline bg-[#faf9f7] p-1.5">
        {VIEWS.map((view) =>
          view === 'GTA_6' ? (
            <GTA6Button key={view} selected={value === view} onClick={() => onChange(view)} />
          ) : (
            <button
              key={view}
              type="button"
              onClick={() => onChange(view)}
              aria-pressed={value === view}
              className={cn(
                'relative isolate z-10 min-w-0 overflow-hidden rounded-[13px] px-1 py-3 text-[10px] font-semibold tracking-[0.1em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-4 sm:text-[11px] sm:tracking-[0.2em]',
                value === view ? 'text-white' : 'text-black hover:bg-black/5',
              )}
            >
              {VIEW_LABELS[view]}
              {value === view ? (
                <motion.span
                  layoutId="view-toggle-indicator"
                  className="absolute inset-0 -z-10 rounded-[13px] bg-black"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              ) : null}
            </button>
          ),
        )}
      </div>
      {value === 'NON_REP' ? (
        <p className="mt-1.5 text-center text-[10px] tracking-[0.14em] text-muted">
          High-quality non-rep pieces
        </p>
      ) : null}
      {value === 'GTA_6' ? (
        <p className="mt-1.5 text-center text-[10px] tracking-[0.14em] text-muted">
          GTA 6 collection
        </p>
      ) : null}
    </div>
  );
}

