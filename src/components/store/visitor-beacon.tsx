'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'rm_vid';

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

async function ping(path: string) {
  const visitorId = getVisitorId();
  if (!visitorId) return;
  try {
    await fetch('/api/analytics/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, path }),
      keepalive: true,
    });
  } catch {
    // ignore network errors — analytics should never break the shop
  }
}

export function VisitorBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    void ping(pathname);
    const interval = window.setInterval(() => {
      void ping(pathname);
    }, 90_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void ping(pathname);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
