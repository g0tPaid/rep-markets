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
    <div className="px-4 pb-2 pt-1">
      <div className="relative grid grid-cols-2 border border-hairline">
        {VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            className={cn(
              'relative z-10 px-4 py-3 text-[11px] font-semibold tracking-[0.2em] transition',
              value === view ? 'text-white' : 'text-black',
            )}
          >
            {VIEW_LABELS[view]}
            {value === view ? (
              <motion.span
                layoutId="view-toggle-indicator"
                className="absolute inset-0 -z-10 bg-black"
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            ) : null}
          </button>
        ))}
      </div>
      {value === 'NON_REP' ? (
        <p className="mt-2 text-center text-[10px] tracking-[0.14em] text-muted">
          High-quality non-rep pieces
        </p>
      ) : null}
    </div>
  );
}
