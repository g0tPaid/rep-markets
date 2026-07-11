'use client';

import { motion } from 'framer-motion';
import { type ProductView, VIEWS } from '@/lib/products';
import { cn } from '@/lib/utils';

type ViewToggleProps = {
  value: ProductView;
  onChange: (view: ProductView) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="px-4 py-4">
      <div className="relative grid grid-cols-2 border border-black p-1">
        {VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            className={cn(
              'relative z-10 h-9 text-[11px] font-semibold tracking-[0.22em] transition-colors',
              value === view ? 'text-white' : 'text-black',
            )}
          >
            {view}
            {value === view ? (
              <motion.span
                layoutId="view-toggle-indicator"
                className="absolute inset-0 -z-10 bg-black"
                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
