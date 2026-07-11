'use client';

import { CATEGORIES, type ProductCategory } from '@/lib/products';
import { cn } from '@/lib/utils';

type CategoryNavProps = {
  value: ProductCategory;
  onChange: (category: ProductCategory) => void;
};

export function CategoryNav({ value, onChange }: CategoryNavProps) {
  return (
    <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-hairline px-4 py-3" aria-label="Product categories">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium tracking-[0.18em] transition',
            value === category
              ? 'border-black bg-black text-white'
              : 'border-hairline bg-white text-black hover:border-black',
          )}
        >
          {category}
        </button>
      ))}
    </nav>
  );
}
