'use client';

import Link from 'next/link';
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, ImageIcon, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QualityPriceRange } from '@/components/store/quality-price-range';
import { getQualityOption, priceForQuality, QUALITY_OPTIONS, type StoreProduct } from '@/lib/products';
import { useCart } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

const SWIPE_DISTANCE = 72;

export function SwipeCatalog({ products }: { products: StoreProduct[] }) {
  const [index, setIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [status, setStatus] = useState('');
  const chooseButton = useRef<HTMLButtonElement>(null);
  const product = products[index];

  function next() {
    setChoosing(false);
    setIndex(index + 1);
  }

  function chooseOptions() {
    chooseButton.current?.focus({ preventScroll: true });
    setChoosing(true);
  }

  return (
    <section aria-label="Swipe products" className="mx-auto w-full max-w-[450px] px-5 pb-10 pt-3">
      {product ? (
        <>
          <p className="mb-4 flex justify-between gap-3 text-xs text-neutral-600">
            <span>Left to skip · right to choose</span>
            <span>{index + 1} / {products.length}</span>
          </p>
          <div className="relative isolate mx-2">
            {index + 1 < products.length ? (
              <div aria-hidden className="absolute inset-x-3 -bottom-2 top-3 -z-10 rounded-[1.8rem] border border-rose-200 bg-rose-50" />
            ) : null}
            <SwipeCard key={product.id} product={product} onSkip={next} onChoose={chooseOptions} />
          </div>
          <div className="mt-6 grid grid-cols-[1fr_1.5fr] gap-3">
            <button type="button" onClick={next} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50">
              <ArrowLeft size={17} aria-hidden /> Skip
            </button>
            <button ref={chooseButton} type="button" onClick={chooseOptions} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800">
              <ShoppingBag size={17} aria-hidden /> Choose options
            </button>
          </div>
          {choosing ? (
            <ProductOptions
              product={product}
              onClose={() => setChoosing(false)}
              onAdded={() => {
                setStatus(`${product.name} added to your cart.`);
                next();
              }}
            />
          ) : null}
        </>
      ) : (
        <div className="rounded-3xl border border-hairline bg-surface px-6 py-12 text-center">
          <h2 className="font-serif text-3xl">{products.length ? 'You’ve seen this selection' : 'No products in this category yet'}</h2>
          {products.length ? (
            <button type="button" onClick={() => setIndex(0)} className="mt-5 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold">
              Start again
            </button>
          ) : null}
        </div>
      )}
      <p role="status" className="mt-3 min-h-5 text-center text-sm font-medium text-emerald-800">{status}</p>
    </section>
  );
}

function SwipeCard({
  product, onSkip, onChoose,
}: {
  product: StoreProduct;
  onSkip: () => void;
  onChoose: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-10, 10]);
  const skipOpacity = useTransform(x, [-SWIPE_DISTANCE, -16], [1, 0]);
  const chooseOpacity = useTransform(x, [16, SWIPE_DISTANCE], [0, 1]);
  const reduceMotion = useReducedMotion();
  const onSale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;

  return (
    <motion.article
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      dragMomentum={false}
      style={{ x, rotate: reduceMotion ? 0 : rotate, touchAction: 'pan-y' }}
      onDragEnd={(event, { offset }) => {
        if (event.type === 'pointercancel') return;
        if (offset.x >= SWIPE_DISTANCE) onChoose();
        if (offset.x <= -SWIPE_DISTANCE) onSkip();
      }}
      className="relative overflow-hidden rounded-[1.8rem] border border-hairline bg-white shadow-[0_12px_35px_-20px_#6d193b70]"
    >
      <div className="relative flex h-[clamp(255px,48svh,450px)] cursor-grab items-center justify-center overflow-hidden bg-surface active:cursor-grabbing">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} draggable={false} className="size-full select-none object-cover" />
        ) : (
          <ImageIcon className="text-neutral-400" size={36} aria-label="No product image available" />
        )}
        {onSale || product.freeShipping ? (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {onSale ? <span className="rounded-full bg-rose-700 px-3 py-1 text-xs font-semibold text-white">Sale</span> : null}
            {product.freeShipping ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-950">Free shipping</span> : null}
          </div>
        ) : null}
        <motion.span aria-hidden style={{ opacity: chooseOpacity }} className="pointer-events-none absolute left-4 top-4 rounded-full bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Choose</motion.span>
        <motion.span aria-hidden style={{ opacity: skipOpacity }} className="pointer-events-none absolute right-4 top-4 rounded-full bg-rose-700 px-4 py-2 text-sm font-bold text-white">Skip</motion.span>
      </div>
      <div className="px-5 pb-5 pt-4">
        <p className="text-xs font-medium text-neutral-600">{product.category}</p>
        <h2 className="mt-1 break-words font-serif text-3xl leading-tight">{product.name}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <QualityPriceRange product={product} normalClassName="text-lg font-bold text-rose-700" highClassName="text-sm font-semibold text-neutral-700" />
          <Link href={`/product/${product.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">
            Product details <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

const selectClassName = 'mt-1.5 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base';

function ProductOptions({
  product, onClose, onAdded,
}: {
  product: StoreProduct;
  onClose: () => void;
  onAdded: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const addItem = useCart((state) => state.addItem);
  const [size, setSize] = useState(product.sizes.length ? '' : 'OS');
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0] : '');
  const [quality, setQuality] = useState('');
  const base = product.salePrice ?? product.price;
  const ready = Boolean(size && quality && (!product.colors.length || color));
  const price = priceForQuality(base, quality, product.qualityPrices);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0],
      size,
      color: color || undefined,
      quality,
      qualityLabel: getQualityOption(quality).label,
      price,
    }, { openCart: false });
    dialog.current?.close();
    onAdded();
  }

  function dismiss() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="swipe-options-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90svh] w-full max-w-none touch-manipulation overflow-y-auto rounded-t-[1.8rem] border border-hairline bg-white p-0 text-neutral-950 shadow-2xl backdrop:bg-black/45 sm:inset-0 sm:m-auto sm:max-w-[420px] sm:rounded-[1.8rem]"
    >
      <form onSubmit={submit} className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="swipe-options-title" className="font-serif text-3xl leading-tight">Choose your options</h2>
            <p className="mt-1 text-sm text-neutral-600">{product.name}</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close options" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface"><X size={18} aria-hidden /></button>
        </div>
        {product.sizes.length ? (
          <label className="block text-sm font-semibold">
            Size
            <select required value={size} onChange={(event) => setSize(event.target.value)} className={selectClassName}>
              <option value="" disabled>Select a size</option>
              {product.sizes.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ) : <p className="text-sm font-semibold">Size · One size</p>}
        {product.colors.length ? (
          <label className="block text-sm font-semibold">
            Color
            <select required value={color} onChange={(event) => setColor(event.target.value)} className={selectClassName}>
              <option value="" disabled>Select a color</option>
              {product.colors.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-semibold">
          Quality
          <select required value={quality} onChange={(event) => setQuality(event.target.value)} className={selectClassName}>
            <option value="" disabled>Select a quality</option>
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {formatPrice(priceForQuality(base, option.id, product.qualityPrices))}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!ready} className="min-h-12 w-full rounded-full bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:bg-neutral-200 disabled:text-neutral-600">
          Add to cart{quality ? ` · ${formatPrice(price)}` : ''}
        </button>
      </form>
    </dialog>
  );
}
