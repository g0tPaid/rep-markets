'use client';

import { motion } from 'framer-motion';
import { type ProductView, VIEW_LABELS, VIEWS } from '@/lib/products';
import { cn } from '@/lib/utils';

type ViewToggleProps = {
  value: ProductView;
  onChange: (view: ProductView) => void;
};

function GTA6Button({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label="Browse GTA 6 collection"
      className={cn(
        'group relative isolate flex min-h-[62px] min-w-0 items-center justify-center overflow-hidden rounded-[13px] border p-1.5 text-white transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d74687] active:scale-[0.98]',
        selected
          ? 'border-[#f7add1] shadow-[0_0_0_2px_#dd4c91,0_3px_14px_rgba(133,32,116,0.32)]'
          : 'border-[#cb79ac] shadow-[0_2px_8px_rgba(84,20,79,0.2)] hover:border-[#ffb4db] hover:shadow-[0_4px_15px_rgba(133,32,116,0.35)]',
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(120deg,#261b50_0%,#753c8a_34%,#db5f98_70%,#ffba85_100%)]" />

      {/* Original decorative artwork: neon sunset, skyline and tropical palms. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 180 86"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="gta6-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF4DC" />
            <stop offset="100%" stopColor="#FFAAAE" />
          </linearGradient>
          <linearGradient id="gta6-cloud" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FED9CE" stopOpacity=".02" />
            <stop offset="100%" stopColor="#FFE1E7" stopOpacity=".65" />
          </linearGradient>
        </defs>
        <circle cx="145" cy="26" r="24" fill="url(#gta6-sun)" opacity=".92" />
        <path d="M110 34H176M117 40H177M124 46H178" stroke="#F27B99" strokeOpacity=".65" strokeWidth="2" />
        <path d="M-10 19Q35 5 77 18M105 12Q137 1 190 11" stroke="url(#gta6-cloud)" strokeWidth="3" />
        <path d="M0 76V64H6V60H11V68H18V58H23V65H30V54H36V68H42V62H47V71H57V60H63V72H78V64H84V73H98V63H105V72H117V61H124V69H136V61H141V72H153V65H161V70H168V61H177V73H180V86H0Z" fill="#291947" fillOpacity=".45" />
        <path d="M0 85Q42 73 83 84T180 79V89H0Z" fill="#20163D" fillOpacity=".66" />
        <path d="M156 92Q154 54 161 31" stroke="#211732" strokeWidth="3.6" strokeLinecap="round" />
        <g fill="#211732">
          <path d="M161 31Q149 10 131 9Q149 18 161 31Z" />
          <path d="M161 31Q137 24 123 36Q142 29 161 31Z" />
          <path d="M161 31Q167 8 182 3Q169 20 161 31Z" />
          <path d="M161 31Q178 15 194 20Q173 24 161 31Z" />
          <path d="M161 31Q186 31 194 48Q177 35 161 31Z" />
        </g>
        <path d="M18 88Q23 57 18 43" stroke="#28163D" strokeWidth="3.3" strokeLinecap="round" />
        <g fill="#28163D">
          <path d="M18 43Q6 23 -5 25Q10 36 18 43Z" />
          <path d="M18 43Q-2 41 -5 56Q9 44 18 43Z" />
          <path d="M18 43Q16 25 30 13Q23 31 18 43Z" />
          <path d="M18 43Q31 25 47 30Q30 34 18 43Z" />
          <path d="M18 43Q40 43 47 57Q31 45 18 43Z" />
        </g>
        <path d="M1 1H179V85H1Z" stroke="white" strokeOpacity=".19" strokeWidth="1.5" />
      </svg>

      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[36%] bg-gradient-to-b from-white/20 to-transparent" />
      <span className="relative z-10 flex items-center justify-center gap-1.5 text-center drop-shadow-[0_2px_1px_rgba(34,11,48,0.95)]">
        <span className="flex flex-col items-center justify-center">
          <span className="text-[15px] font-black italic leading-[0.95] tracking-[-0.07em] sm:text-[18px]">GTA</span>
          <span className="mt-1 text-[6px] font-extrabold leading-none tracking-[0.17em] text-white/90 sm:text-[7px]">COLLECTION</span>
        </span>
        <span
          className="bg-[linear-gradient(160deg,#fff9e5_10%,#ffd8e9_45%,#ffbc93_78%)] bg-clip-text text-[37px] font-black italic leading-none tracking-[-0.11em] text-transparent sm:text-[43px]"
          style={{ WebkitTextStroke: '0.35px rgba(255,255,255,0.7)', filter: 'drop-shadow(1px 2px 0 #6b2359)' }}
        >
          6
        </span>
      </span>
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
