'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Header } from '@/components/store/header';
import { placeOrder } from '@/app/actions/checkout';
import { useCart } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const items = useCart((state) => state.items);
  const subtotal = useCart((state) => state.subtotal());
  const clear = useCart((state) => state.clear);
  const shipping = 0;
  const total = subtotal;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || submitting) return;

    setSubmitting(true);
    setError('');

    const form = new FormData(event.currentTarget);
    const result = await placeOrder({
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      customerName: String(form.get('customerName') || ''),
      line1: String(form.get('line1') || ''),
      line2: String(form.get('line2') || ''),
      city: String(form.get('city') || ''),
      postalCode: String(form.get('postalCode') || ''),
      country: String(form.get('country') || ''),
      notes: String(form.get('notes') || ''),
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        quality: item.quality,
        qualityLabel: item.qualityLabel,
        imageUrl: item.imageUrl,
      })),
      subtotal,
      shipping,
      total,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    clear();
    setPlacedOrderNumber(result.orderNumber);
  }

  if (placedOrderNumber) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <section className="px-4 py-16 text-center">
          <p className="text-[11px] font-semibold tracking-[0.24em] text-muted">ORDER RECEIVED</p>
          <h1 className="mt-4 font-serif text-[48px] leading-[0.92] tracking-[-0.06em]">Thank you.</h1>
          <p className="mx-auto mt-6 max-w-[320px] border border-black/10 bg-surface px-5 py-4 text-sm">
            Your order number
            <span className="mt-2 block font-serif text-[28px] tracking-[-0.04em] text-black">
              {placedOrderNumber}
            </span>
          </p>
          <div className="mx-auto mt-6 max-w-[320px] text-left text-sm leading-6 text-black/80">
            <p>
              Someone from the team will contact you for <span className="font-semibold">payment</span> and{' '}
              <span className="font-semibold">QC</span>.
            </p>
            <p className="mt-3 text-muted">
              Please keep your phone and WhatsApp available. Save your order number for reference.
            </p>
          </div>
          <a
            href={`https://wa.me/8618059262730?text=${encodeURIComponent(`Hi AJ, I just placed order ${placedOrderNumber}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full max-w-[320px] items-center justify-center border border-[#25D366] bg-[#25D366] px-5 py-4 text-[11px] font-semibold tracking-[0.14em] text-white"
          >
            Message us on WhatsApp
          </a>
          <Link
            href="/"
            className="mt-4 inline-block text-[11px] font-semibold tracking-[0.22em] underline underline-offset-4"
          >
            BACK TO SHOP
          </Link>
        </section>
      </main>
    );
  }

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
              <div
                key={`${item.productId}-${item.size ?? 'default'}-${item.quality ?? 'default'}`}
                className="flex justify-between gap-4 text-sm"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    Qty {item.quantity}
                    {item.size ? ` / ${item.size}` : ''}
                    {item.qualityLabel ? ` / ${item.qualityLabel}` : ''}
                  </p>
                </div>
                <p>{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="font-serif text-3xl tracking-[-0.04em]">Your cart is empty.</p>
            <Link
              href="/"
              className="mt-4 inline-block text-[11px] font-semibold tracking-[0.22em] underline underline-offset-4"
            >
              RETURN TO SHOP
            </Link>
          </div>
        )}
      </section>

      <form onSubmit={onSubmit} className="space-y-6 px-4 py-6">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em]">CONTACT</legend>
          <input
            required
            name="email"
            type="email"
            placeholder="Email"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            required
            name="phone"
            type="tel"
            placeholder="Phone / WhatsApp"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em]">SHIPPING</legend>
          <input
            required
            name="customerName"
            placeholder="Full name"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            required
            name="line1"
            placeholder="Address"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            name="line2"
            placeholder="Apartment, suite (optional)"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              name="city"
              placeholder="City"
              className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
            />
            <input
              required
              name="postalCode"
              placeholder="Postal code"
              className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>
          <input
            required
            name="country"
            placeholder="Country"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
          <textarea
            name="notes"
            rows={3}
            placeholder="Notes (optional)"
            className="w-full border border-hairline px-4 py-3 text-sm outline-none focus:border-black"
          />
        </fieldset>

        <div className="space-y-2 border-t border-hairline pt-5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between pt-3 text-base">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={!items.length || submitting}
          className="w-full bg-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em] text-white disabled:bg-neutral-300"
        >
          {submitting ? 'PLACING ORDER…' : 'PLACE ORDER'}
        </button>
        <p className="text-center text-xs leading-5 text-muted">
          After you place the order, someone from the team will contact you for payment and QC.
        </p>
      </form>
    </main>
  );
}
