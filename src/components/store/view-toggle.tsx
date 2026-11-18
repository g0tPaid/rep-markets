'use client';

import { motion } from 'framer-motion';
import { type ProductView, VIEW_LABELS, VIEWS } from '@/lib/products';
import { cn } from '@/lib/utils';

type ViewToggleProps = {
  value: ProductView;
  onChange: (view: ProductView) => void;
};

// Official Rockstar Games GTA VI artwork and title mark, rather than approximations.
// Source: https://www.rockstargames.com/VI/media/artwork-wallpapers
const OFFICIAL_GTA6_ART = 'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg';
const OFFICIAL_GTA6_LOGO = 'https://media-rockstargames-com.akamaized.net/tina-uploads/posts/3928aaa9471o3a/7ff0c4b640e5979c692e869a2c01781c596d30bd.png';

function GTA6Button({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label="Browse GTA 6 collection"
      className={cn(
        'group relative isolate flex min-h-[62px] min-w-0 items-center justify-center overflow-hidden rounded-[13px] border bg-[#281b42] text-white transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#df5292] active:scale-[0.98]',
        selected
          ? 'border-[#ffaad4] shadow-[0_0_0_2px_#d63d8c,0_4px_16px_rgba(108,29,89,0.32)]'
          : 'border-[#b7689c] shadow-[0_2px_8px_rgba(84,20,79,0.2)] hover:border-[#ffb4db] hover:shadow-[0_4px_15px_rgba(133,32,116,0.35)]',
      )}
    >
      {/* Genuine GTA VI cover artwork from Rockstar's website. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OFFICIAL_GTA6_ART}
        alt=""
        aria-hidden="true"
        loading="lazy"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-95 transition-transform duration-300 group-hover:scale-110"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/25" />

      {/* Actual Grand Theft Auto VI logo artwork, not recreated lettering. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OFFICIAL_GTA6_LOGO}
        alt="Grand Theft Auto VI"
        loading="lazy"
        draggable={false}
        className="pointer-events-none relative z-10 h-[56px] w-[78px] max-w-[90%] object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)] sm:w-[94px]"
      />
      {selected ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/70" /> : null}
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
