'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { StoreProduct } from '@/lib/products';
import { useWishlist } from '@/lib/store';
import { cn, formatPrice } from '@/lib/utils';

type ProductCardProps = {
  product: StoreProduct & { image?: string };
  view?: 'REPS' | 'NON_REP';
};

export function ProductCard({ product, view = 'REPS' }: ProductCardProps) {
  const toggle = useWishlist((state) => state.toggle);
  const liked = useWishlist((state) => state.has(product.id));
  const image = product.image || (view === 'NON_REP' ? product.images.model[0] : product.images.item[0]);

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
          style={{ backgroundImage: `url("${image}")` }}
          aria-label={`View ${product.name}`}
        />
        <button
          type="button"
          onClick={() => toggle(product.id)}
          className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/85 text-black backdrop-blur"
          aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={liked}
        >
          <Heart className={cn('size-3.5', liked && 'fill-black')} strokeWidth={1.7} />
        </button>
      </div>
      <Link href={`/product/${product.slug}`} className="mt-2 block">
        <h3 className="truncate text-[11px] font-medium uppercase tracking-[0.12em]">{product.name}</h3>
        <p className="mt-1 text-[11px] font-medium text-red-600">
          {formatPrice(product.salePrice ?? product.price)}
        </p>
      </Link>
    </article>
  );
}
