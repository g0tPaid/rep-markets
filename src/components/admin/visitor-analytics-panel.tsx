'use client';

import { useEffect, useState } from 'react';

type CountryRow = {
  country: string;
  countryName: string;
  visitors: number;
};

type VisitorStats = {
  totalVisitors: number;
  liveVisitors: number;
  pageViewsToday: number;
  pageViewsTotal: number;
  byCountry: CountryRow[];
  liveByCountry: CountryRow[];
  liveWindowSeconds: number;
};

const EMPTY: VisitorStats = {
  totalVisitors: 0,
  liveVisitors: 0,
  pageViewsToday: 0,
  pageViewsTotal: 0,
  byCountry: [],
  liveByCountry: [],
  liveWindowSeconds: 120,
};

export function VisitorAnalyticsPanel() {
  const [stats, setStats] = useState<VisitorStats>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/admin/analytics/visitors', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Could not load visitor stats');
        }
        const data = (await response.json()) as VisitorStats;
        if (!cancelled) {
          setStats(data);
          setError(null);
          setUpdatedAt(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load visitor stats');
        }
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const maxCountry = Math.max(1, ...stats.byCountry.map((row) => row.visitors));

  return (
    <section className="border border-blue-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-blue-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-blue-700">Website visitors</h2>
          <p className="mt-1 text-sm text-blue-400">
            Unique browsers · country from edge headers · live = active in last{' '}
            {Math.round(stats.liveWindowSeconds / 60) || 2} min
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          Live
          {updatedAt ? (
            <span className="text-blue-300">· {updatedAt.toLocaleTimeString()}</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="p-5 text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid gap-4 border-b border-blue-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-400">Total visitors</p>
              <p className="mt-2 text-3xl font-semibold text-blue-700">
                {stats.totalVisitors.toLocaleString()}
              </p>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/70">Live now</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">
                {stats.liveVisitors.toLocaleString()}
              </p>
            </div>
            <div className="border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-400">Page views today</p>
              <p className="mt-2 text-3xl font-semibold text-blue-700">
                {stats.pageViewsToday.toLocaleString()}
              </p>
            </div>
            <div className="border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-400">
                Total website since starting
              </p>
              <p className="mt-2 text-3xl font-semibold text-blue-700">
                {stats.pageViewsTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-500">
                Visitors by country
              </h3>
              {stats.byCountry.length ? (
                <ul className="mt-4 space-y-3">
                  {stats.byCountry.slice(0, 12).map((row) => (
                    <li key={`${row.country}-${row.countryName}`}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm text-blue-800">
                        <span>
                          <span className="font-medium">{row.countryName}</span>
                          <span className="ml-2 text-xs text-blue-400">{row.country}</span>
                        </span>
                        <span className="font-semibold">{row.visitors.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden bg-blue-100">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${Math.max(4, (row.visitors / maxCountry) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-blue-400">
                  No visitors tracked yet. Open the storefront to start collecting.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700/80">
                Live by country
              </h3>
              {stats.liveByCountry.length ? (
                <ul className="mt-4 divide-y divide-blue-100 border border-blue-100">
                  {stats.liveByCountry.map((row) => (
                    <li
                      key={`live-${row.country}-${row.countryName}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-blue-800"
                    >
                      <span>
                        {row.countryName}{' '}
                        <span className="text-xs text-blue-400">{row.country}</span>
                      </span>
                      <span className="font-semibold text-emerald-700">{row.visitors}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-blue-400">Nobody live right now.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
