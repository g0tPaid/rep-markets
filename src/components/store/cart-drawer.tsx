'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCart } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const isOpen = useCart((state) => state.isOpen);
  const close = useCart((state) => state.close);
  const items = useCart((state) => state.items);
  const subtotal = useCart((state) => state.subtotal());
  const setQuantity = useCart((state) => state.setQuantity);
  const removeItem = useCart((state) => state.removeItem);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 bg-black/35"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 310 }}
            className="absolute bottom-0 left-1/2 max-h-[86vh] w-full max-w-[428px] -translate-x-1/2 overflow-hidden bg-white"
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.22em]">CART</p>
              <button type="button" onClick={close} className="grid size-8 place-items-center" aria-label="Close cart">
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto px-4 py-4">
              {items.length ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.size ?? 'default'}-${item.quality ?? 'default'}`}
                      className="grid grid-cols-[72px_1fr] gap-3"
                    >
                      <div
                        className="aspect-[3/4] bg-surface bg-cover bg-center"
                        style={{ backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em]">{item.name}</p>
                            <p className="mt-1 text-xs text-muted">
                              {[item.size, item.qualityLabel || item.quality, item.color]
                                .filter(Boolean)
                                .join(' / ') || 'ONE SIZE'}
                            </p>
                          </div>
                          <p className="text-xs">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center border border-hairline">
                            <button
                              type="button"
                              className="size-8 text-sm"
                              onClick={() =>
                                setQuantity(item.productId, item.quantity - 1, item.size, item.quality)
                              }
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              className="size-8 text-sm"
                              onClick={() =>
                                setQuantity(item.productId, item.quantity + 1, item.size, item.quality)
                              }
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.size, item.quality)}
                            className="text-[10px] font-medium tracking-[0.16em] text-muted"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="font-serif text-3xl tracking-[-0.04em]">Your cart is quiet.</p>
                  <p className="mt-3 text-sm text-muted">Add one piece from rep.markets to begin.</p>
                </div>
              )}
            </div>

            <div className="border-t border-hairline p-4">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={close}
                className="block bg-black px-5 py-4 text-center text-[11px] font-semibold tracking-[0.22em] text-white"
              >
                CHECKOUT
              </Link>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
