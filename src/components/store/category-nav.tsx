'use client';

import type { ProductCategory, StoreNavCategory } from '@/lib/products';
import { cn } from '@/lib/utils';

type CategoryNavProps = {
  categories: StoreNavCategory[];
  value: ProductCategory;
  onChange: (category: ProductCategory) => void;
};

export function CategoryNav({ categories, value, onChange }: CategoryNavProps) {
  const pills: Array<{ key: string; label: string }> = [
    { key: 'ALL', label: 'ALL' },
    ...categories.map((category) => ({
      key: category.slug,
      label: category.label,
    })),
  ];

  return (
    <nav
      className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-hairline px-4 py-1.5"
      aria-label="Product categories"
    >
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={() => onChange(pill.key)}
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium tracking-[0.14em] transition',
            value === pill.key
              ? 'border-black bg-black text-white'
              : 'border-hairline bg-white text-black hover:border-black',
          )}
        >
          {pill.label}
        </button>
      ))}
    </nav>
  );
}
