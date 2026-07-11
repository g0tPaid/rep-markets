'use client';

import Link from 'next/link';
import { Header } from '@/components/store/header';
import { useCart } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const items = useCart((state) => state.items);
  const subtotal = useCart((state) => state.subtotal());
  const shipping = subtotal > 0 ? 12 : 0;
  const total = subtotal + shipping;

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="px-4 py-8">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.24em] text-muted">SECURE CHECKOUT</p>
        <h1 className="font-serif text-[54px] leading-[0.9] tracking-[-0.07em]">Finish with less.</h1>
      </section>

      <section className="border-y border-hairline px-4 py-5">
        <h2 className="mb-4 text-[11px] font-semibold tracking-[0.22em]">ORDER</h2>
        {items.length ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.size ?? 'default'}`} className="flex justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    Qty {item.quantity}
                    {item.size ? ` / ${item.size}` : ''}
                  </p>
                </div>
                <p>{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="font-serif text-3xl tracking-[-0.04em]">Your cart is empty.</p>
            <Link href="/" className="mt-4 inline-block text-[11px] font-semibold tracking-[0.22em] underline underline-offset-4">
              RETURN TO SHOP
            </Link>
          </div>
        )}
      </section>

      <form className="space-y-6 px-4 py-6">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em]">CONTACT</legend>
          <input required type="email" placeholder="Email" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
          <input required type="tel" placeholder="Phone" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em]">SHIPPING</legend>
          <input required placeholder="Full name" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
          <input required placeholder="Address" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="City" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
            <input required placeholder="Postal code" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
          </div>
          <input required placeholder="Country" className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black" />
        </fieldset>

        <div className="space-y-2 border-t border-hairline pt-5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Shipping</span>
            <span>{formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between pt-3 text-base">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!items.length}
          className="w-full bg-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em] text-white disabled:bg-neutral-300"
        >
          PLACE ORDER
        </button>
      </form>
    </main>
  );
}
