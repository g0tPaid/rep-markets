'use client';

import { motion } from 'framer-motion';
import { type ProductView, VIEW_LABELS, VIEWS } from '@/lib/products';
import { cn } from '@/lib/utils';

type ViewToggleProps = {
  value: ProductView;
  onChange: (view: ProductView) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="px-4 pb-1.5 pt-0">
      <div className="relative grid grid-cols-3 items-stretch gap-1 rounded-2xl border border-hairline bg-[#f9f8f6] p-1">
        {VIEWS.map((view) =>
          view === 'GTA_6' ? (
            <button
              key={view}
              type="button"
              onClick={() => onChange(view)}
              aria-label="Browse GTA 6 collection"
              aria-pressed={value === view}
              className={cn(
                'relative isolate flex min-h-[54px] min-w-0 items-center justify-center overflow-hidden rounded-xl border px-1.5 py-1 text-white shadow-[0_2px_8px_rgba(106,37,100,0.18)] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
                value === view
                  ? 'border-[#7e2867] ring-2 ring-[#ff88bb] ring-offset-1'
                  : 'border-[#eaa1cb] hover:brightness-110 active:scale-[0.98]',
              )}
            >
              <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#6438a5] via-[#d0529b] to-[#ffb267]" />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 170 80"
                preserveAspectRatio="xMidYMid slice"
              >
                <circle cx="125" cy="24" r="19" fill="#FFE2B2" opacity="0.9" />
                <path d="M0 70 Q40 48 80 65 T170 61 V80 H0Z" fill="#55275F" opacity="0.62" />
                <path d="M91 85 Q95 57 102 42" stroke="#391744" strokeWidth="4" strokeLinecap="round" fill="none" />
                <g fill="#391744">
                  <path d="M102 42 Q81 31 62 40 Q82 40 102 42Z" />
                  <path d="M102 42 Q87 22 60 24 Q83 32 102 42Z" />
                  <path d="M102 42 Q99 21 116 7 Q108 28 102 42Z" />
                  <path d="M102 42 Q121 22 147 25 Q121 33 102 42Z" />
                  <path d="M102 42 Q125 35 142 57 Q120 47 102 42Z" />
                </g>
                <path d="M0 80 L16 61 L22 80Z M151 80 L166 57 L170 80Z" fill="#391744" opacity=".8" />
              </svg>
              <span className="relative z-10 flex items-center gap-1 drop-shadow-[0_2px_3px_rgba(39,8,48,0.8)]">
                <span className="text-[11px] font-black tracking-[0.03em] sm:text-[13px]">GTA</span>
                <span className="bg-gradient-to-b from-white via-[#ffe0ed] to-[#ffd3a3] bg-clip-text text-[30px] font-black italic leading-none tracking-[-0.08em] text-transparent sm:text-[34px]">
                  6
                </span>
              </span>
              {value === view ? (
                <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/50" />
              ) : null}
            </button>
          ) : (
            <button
              key={view}
              type="button"
              onClick={() => onChange(view)}
              aria-pressed={value === view}
              className={cn(
                'relative isolate z-10 min-w-0 overflow-hidden rounded-xl px-1 py-3 text-[10px] font-semibold tracking-[0.1em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-4 sm:text-[11px] sm:tracking-[0.2em]',
                value === view ? 'text-white' : 'text-black hover:bg-black/5',
              )}
            >
              {VIEW_LABELS[view]}
              {value === view ? (
                <motion.span
                  layoutId="view-toggle-indicator"
                  className="absolute inset-0 -z-10 rounded-xl bg-black"
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
