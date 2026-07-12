'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { StoreProduct } from '@/lib/products';
import { useWishlist } from '@/lib/store';
import { cn, formatPrice } from '@/lib/utils';

type ProductCardProps = {
  product: StoreProduct & { image?: string };
};

export function ProductCard({ product }: ProductCardProps) {
  const toggle = useWishlist((state) => state.toggle);
  const liked = useWishlist((state) => state.has(product.id));
  const image = product.image || product.images[0];
  const [broken, setBroken] = useState(false);

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
        <Link href={`/product/${product.slug}`} className="absolute inset-0" aria-label={`View ${product.name}`}>
          {image && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[9px] uppercase tracking-[0.14em] text-muted">
              Photo needed
            </div>
          )}
        </Link>
        {product.featured && product.homepageOrder ? (
          <span className="absolute left-1.5 top-1.5 grid min-w-6 place-items-center bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-black backdrop-blur">
            {product.homepageOrder}
          </span>
        ) : null}
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
      <Link href={`/product/${product.slug}`} className="mt-1.5 block">
        <h3 className="truncate text-[11px] font-medium leading-tight uppercase tracking-[0.12em]">{product.name}</h3>
        <p className="mt-0.5 text-center text-[11px] font-medium leading-tight text-emerald-600">
          {formatPrice(product.salePrice ?? product.price)}
        </p>
      </Link>
    </article>
  );
}
