'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/store/header';
import { ProductCard } from '@/components/store/product-card';
import {
  ProductBrandMark,
  ProductBrandWatermark,
} from '@/components/store/product-brand-watermark';
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const gallery = useMemo(
    () => (product.images.length ? product.images.slice(0, 15) : []),
    [product.images],
  );
  const heroImages = gallery.slice(0, 2);
  const moreImages = gallery.slice(2);
  const basePrice = product.salePrice ?? product.price;
  const quality = getQualityOption(selectedQuality);
  const unitPrice = priceForQuality(basePrice, selectedQuality, product.qualityPrices);
  const tierPrices = QUALITY_OPTIONS.map((option) =>
    priceForQuality(basePrice, option.id, product.qualityPrices),
  );
  const lowestPrice = Math.min(...tierPrices);
  const highestPrice = Math.max(...tierPrices);
  const hasPriceRange = Math.abs(highestPrice - lowestPrice) > 0.01;

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowRight') {
        setLightboxIndex((current) =>
          current === null ? null : (current + 1) % gallery.length,
        );
      }
      if (event.key === 'ArrowLeft') {
        setLightboxIndex((current) =>
          current === null ? null : (current - 1 + gallery.length) % gallery.length,
        );
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxIndex, gallery.length]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <ProductBrandWatermark />
      <div className="relative z-[2]">
      <Header />
      <div className="relative space-y-2 bg-transparent p-1">
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-2xl">
          <div className="absolute left-1/2 top-1/2 flex w-[240%] -translate-x-1/2 -translate-y-1/2 -rotate-45 flex-col gap-8 opacity-[0.09]">
            {Array.from({ length: 10 }, (_, row) => (
              <div
                key={`gal-${row}`}
                className="flex whitespace-nowrap"
                style={{ marginLeft: row % 2 === 0 ? '0' : '3.5rem' }}
              >
                {Array.from({ length: 6 }, (_, col) => (
                  <span
                    key={col}
                    className="px-5 font-serif text-[18px] font-bold tracking-[-0.02em] text-black"
                  >
                    www.rep.markets
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-[2] grid grid-cols-2 gap-1">
          {heroImages.map((image, index) => (
            <button
              key={`hero-${image}-${index}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="relative block overflow-hidden rounded-2xl bg-surface text-left"
              aria-label={`Enlarge ${product.name} image ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`${product.name} gallery image ${index + 1}`}
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
                className="aspect-[3/4] w-full object-cover"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                <span className="-rotate-45 font-serif text-[15px] font-bold tracking-[-0.02em] text-black/15">
                  www.rep.markets
                </span>
              </span>
            </button>
          ))}
        </div>

        {moreImages.length > 0 ? (
          <div className="relative z-[2] -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            <div className="flex w-max gap-1.5">
              {moreImages.map((image, offset) => {
                const index = offset + 2;
                return (
                  <button
                    key={`thumb-${image}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="relative shrink-0 overflow-hidden rounded-xl bg-surface"
                    aria-label={`Enlarge ${product.name} image ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${product.name} gallery image ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-28 w-[5.5rem] object-cover sm:h-32 sm:w-24"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <span className="-rotate-45 font-serif text-[9px] font-bold text-black/15">
                        www.rep.markets
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">From</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-2xl font-semibold tracking-tight text-red-600">
              {formatPrice(lowestPrice)}
            </p>
            {hasPriceRange ? (
              <>
                <span className="text-base font-medium text-muted" aria-hidden>
                  –
                </span>
                <p className="text-lg font-medium tracking-tight text-black/55">
                  {formatPrice(highestPrice)}
                </p>
              </>
            ) : null}
          </div>
          {selectedQuality !== 'NORMAL' && Math.abs(unitPrice - lowestPrice) > 0.01 ? (
            <p className="mt-1.5 text-xs font-medium text-muted">
              <span className="text-[10px] uppercase tracking-[0.12em]">Selected · {quality.label}</span>{' '}
              <span className="text-sm text-black/70">{formatPrice(unitPrice)}</span>
            </p>
          ) : null}
        </div>
        {product.description ? (
          <p className="mt-5 text-sm leading-6 text-muted">{product.description}</p>
        ) : null}
        {product.material ? (
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">Material: {product.material}</p>
        ) : null}
      </section>

      {lightboxIndex !== null && gallery[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image ${lightboxIndex + 1}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/92"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div>
              <p className="font-serif text-lg leading-tight">{product.name}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold text-red-400">{formatPrice(lowestPrice)}</p>
                {hasPriceRange ? (
                  <p className="text-xs text-white/60">– {formatPrice(highestPrice)}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold tracking-[0.16em]"
              onClick={() => setLightboxIndex(null)}
            >
              CLOSE
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center px-3 pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            {gallery.length > 1 ? (
              <button
                type="button"
                className="absolute left-2 z-10 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur-sm"
                onClick={() =>
                  setLightboxIndex((current) =>
                    current === null ? 0 : (current - 1 + gallery.length) % gallery.length,
                  )
                }
                aria-label="Previous image"
              >
                ‹
              </button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery[lightboxIndex]}
              alt={`${product.name} enlarged image ${lightboxIndex + 1}`}
              className="max-h-[78vh] max-w-full object-contain"
            />
            {gallery.length > 1 ? (
              <button
                type="button"
                className="absolute right-2 z-10 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur-sm"
                onClick={() =>
                  setLightboxIndex((current) =>
                    current === null ? 0 : (current + 1) % gallery.length,
                  )
                }
                aria-label="Next image"
              >
                ›
              </button>
            ) : null}
          </div>
          <p className="pb-5 text-center text-xs tracking-[0.18em] text-white/70">
            {lightboxIndex + 1} / {gallery.length}
          </p>
        </div>
      ) : null}

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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.22em]">QUALITY</p>
          <ProductBrandMark className="text-right" />
        </div>
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
      </div>
    </main>
  );
}
