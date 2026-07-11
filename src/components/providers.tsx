'use client';

import type { ReactNode } from 'react';
import { CartDrawer } from '@/components/store/cart-drawer';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CartDrawer />
    </>
  );
}
