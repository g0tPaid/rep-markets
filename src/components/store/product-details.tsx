'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Header } from '@/components/store/header';
import { ProductCard } from '@/components/store/product-card';
import { VendorBrandBadge } from '@/components/store/vendor-brand-badge';
import {
  getQualityOption,
  priceForQuality,
  QUALITY_OPTIONS,
  type QualityOptionId,
  type StoreProduct,
} from '@/lib/products';
import { useCart } from '@/lib/store';
import { cn, formatPrice } from '@/lib/utils';

type ProductDetailsProps = {
  product: StoreProduct;
  related: StoreProduct[];
};

export function ProductDetails({ product, related }: ProductDetailsProps) {
  const addItem = useCart((state) => state.addItem);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? 'OS');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? '');
  const [selectedQuality, setSelectedQuality] = useState<QualityOptionId>('NORMAL');
  const [quantity, setQuantity] = useState(1);

  const gallery = useMemo(
    () => (product.images.length ? product.images : []),
    [product.images],
  );
  const basePrice = product.salePrice ?? product.price;
  const quality = getQualityOption(selectedQuality);
  const unitPrice = priceForQuality(basePrice, selectedQuality, product.qualityPrices);

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="grid grid-cols-2 gap-1 bg-white p-1">
        {gallery.slice(0, 15).map((image, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${image}-${index}`}
            src={image}
            alt={`${product.name} gallery image ${index + 1}`}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-[3/4] rounded-2xl bg-surface object-cover"
          />
        ))}
      </div>

      <section className="px-4 py-7">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.22em] text-muted">
          {product.line === 'NON_REP' ? 'NON-REP' : 'REP'} · {product.category}
        </p>
        <h1 className="font-serif text-5xl leading-[0.92] tracking-[-0.06em]">{product.name}</h1>
        <VendorBrandBadge
          brand={product.brand}
          brandLogoUrl={product.brandLogoUrl}
          className="mt-3 justify-start"
          logoClassName="size-7"
          showName
        />
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-2xl font-semibold tracking-tight text-red-600">
            {formatPrice(unitPrice)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{quality.label}</p>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">{product.description}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">Material: {product.material}</p>
      </section>

      {product.sizes.length ? (
        <section className="border-y border-hairline px-4 py-5">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.22em]">SIZE</p>
          <div className="grid grid-cols-5 gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={cn(
                  'border px-2 py-3 text-xs font-medium',
                  selectedSize === size ? 'border-black bg-black text-white' : 'border-hairline',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {product.colors.length ? (
        <section
          className={cn(
            'border-hairline px-4 py-5',
            product.sizes.length ? 'border-b' : 'border-y',
          )}
        >
          <p className="mb-3 text-[11px] font-semibold tracking-[0.22em]">COLOR</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  'border px-2 py-3 text-xs font-medium',
                  selectedColor === color ? 'border-black bg-black text-white' : 'border-hairline',
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={cn(
          'border-hairline px-4 py-5',
          product.sizes.length || product.colors.length ? 'border-b' : 'border-y',
        )}
      >
        <p className="mb-3 text-[11px] font-semibold tracking-[0.22em]">QUALITY</p>
        <div className="grid grid-cols-1 gap-2">
          {QUALITY_OPTIONS.map((option) => {
            const optionPrice = priceForQuality(basePrice, option.id, product.qualityPrices);
            const selected = selectedQuality === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedQuality(option.id)}
                className={cn(
                  'flex items-center justify-between border px-4 py-3 text-left',
                  selected ? 'border-black bg-black text-white' : 'border-hairline',
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={cn(
                    option.id === 'NORMAL'
                      ? 'text-base font-semibold'
                      : 'text-xs font-medium',
                    selected
                      ? option.id === 'NORMAL'
                        ? 'text-white'
                        : 'text-white/70'
                      : option.id === 'NORMAL'
                        ? 'text-emerald-700'
                        : 'text-muted',
                  )}
                >
                  {formatPrice(optionPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.22em]">QUANTITY</p>
          <div className="flex items-center border border-hairline">
            <button type="button" className="size-10" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
              -
            </button>
            <span className="min-w-10 text-center text-sm">{quantity}</span>
            <button type="button" className="size-10" onClick={() => setQuantity((value) => value + 1)}>
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: unitPrice,
              imageUrl: product.images[0],
              size: selectedSize,
              color: selectedColor || product.colors[0],
              quality: selectedQuality,
              qualityLabel: quality.label,
              quantity,
            })
          }
          className="w-full bg-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em] text-white"
        >
          ADD TO CART · {formatPrice(unitPrice)}
        </button>
        <a
          href="https://wa.me/8618059262730"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center border border-[#25D366] bg-[#25D366] px-5 py-4 text-center text-[11px] font-semibold tracking-[0.14em] text-white"
        >
          Have more questions? Talk to AJ on WhatsApp
        </a>
      </section>

      <section className="border-t border-hairline px-4 py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-3xl tracking-[-0.05em]">Related</h2>
          <Link href="/" className="text-[10px] font-semibold tracking-[0.18em] text-muted">
            VIEW ALL
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
