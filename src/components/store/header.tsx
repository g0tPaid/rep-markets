'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/store';

export function Header() {
  const open = useCart((state) => state.open);
  const count = useCart((state) => state.count());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center border-b border-hairline bg-white/95 px-4 py-4 backdrop-blur">
      <button
        type="button"
        onClick={open}
        className="text-left text-[11px] font-medium tracking-[0.22em]"
        aria-label="Open cart"
      >
        CART ({mounted ? count : 0})
      </button>
      <Link href="/" className="text-center font-serif text-[24px] leading-none tracking-[-0.03em]" aria-label="rep.markets home">
        rep.markets
      </Link>
      <Link href="/checkout" className="text-right text-[11px] font-medium tracking-[0.22em]">
        CHECKOUT
      </Link>
    </header>
  );
}
