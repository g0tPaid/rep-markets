'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { CartDrawer } from '@/components/store/cart-drawer';
import { SiteShell } from '@/components/store/site-shell';
import { VisitorBeacon } from '@/components/store/visitor-beacon';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    );
  }

  return (
    <SiteShell>
      <VisitorBeacon />
      {children}
      <CartDrawer />
    </SiteShell>
  );
}
