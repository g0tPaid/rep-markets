'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { TrafficExplorer } from '@/components/admin/traffic-explorer';
import type { VisitorAnalytics } from '@/lib/visitor-analytics';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyStats(): VisitorAnalytics {
  const today = todayKey();
  return {
    totalVisitors: 0,
    liveVisitors: 0,
    pageViewsToday: 0,
    pageViewsYesterday: 0,
    pageViewsTotal: 0,
    uniqueVisitorsToday: 0,
    uniqueVisitorsYesterday: 0,
    byCountry: [],
    liveByCountry: [],
    liveWindowSeconds: 120,
    range: { pageviews: 0, uniques: 0 },
    from: today,
    to: today,
    days: [],
    history: [],
    hours: Array.from({ length: 24 }, () => 0),
    peakHour: null,
    countries: [],
    minDate: today,
    maxDate: today,
  };
}

function growthPct(now: number, prev: number): number | null {
  if (!Number.isFinite(now) || !Number.isFinite(prev)) return null;
  if (prev <= 0) return null;
  return ((now - prev) / prev) * 100;
}

function GrowthPill({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
        new
      </span>
    );
  }
  const positive = pct >= 0;
  const abs = Math.abs(pct);
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
        positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700',
      ].join(' ')}
    >
      {positive ? '▲' : '▼'} {abs.toFixed(0)}%
    </span>
  );
}

export function VisitorAnalyticsPanel() {
  const [stats, setStats] = useState<VisitorAnalytics>(emptyStats);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const rangeRef = useRef<{ from?: string; to?: string }>({});

  const load = useCallback(async (from?: string, to?: string, quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) setPending(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    try {
      const response = await fetch(`/api/admin/analytics/visitors${qs ? `?${qs}` : ''}`, {
        cache: 'no-store',
      });
      if (id !== requestId.current) return;
      if (!response.ok) {
        setError('Could not load visitor stats');
        return;
      }
      const data = (await response.json()) as VisitorAnalytics;
      if (id !== requestId.current) return;
      setStats(data);
      rangeRef.current = { from: data.from, to: data.to };
      setError(data.error ?? null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load visitor stats');
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      const { from, to } = rangeRef.current;
      void load(from, to, true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeVisitorsGrowth = growthPct(stats.uniqueVisitorsToday, stats.uniqueVisitorsYesterday);
  const pageViewsGrowth = growthPct(stats.pageViewsToday, stats.pageViewsYesterday);

  return (
    <section className="border border-blue-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-blue-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-blue-700">Website visitors</h2>
          <p className="mt-1 text-sm text-blue-400">
            Unique browsers · country from edge headers · calendar days are UTC · live = active in last{' '}
            {Math.round(stats.liveWindowSeconds / 60) || 2} min
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-blue-700">
              Active today: {stats.uniqueVisitorsToday.toLocaleString()}
            </span>
            <GrowthPill pct={activeVisitorsGrowth} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          Live
          {updatedAt ? <span className="text-blue-300">· {updatedAt.toLocaleTimeString()}</span> : null}
        </div>
      </div>

      <div className="grid gap-4 border-b border-blue-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-400">Total visitors</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{stats.totalVisitors.toLocaleString()}</p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/70">Live now</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.liveVisitors.toLocaleString()}</p>
        </div>
        <div className="border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-400">Page views today</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{stats.pageViewsToday.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-[11px] font-semibold text-blue-600">
              {stats.pageViewsYesterday > 0
                ? `vs yesterday (${stats.pageViewsYesterday.toLocaleString()})`
                : 'first day detected'}
            </p>
            <GrowthPill pct={pageViewsGrowth} />
          </div>
        </div>
        <div className="border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-400">Total website since starting</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{stats.pageViewsTotal.toLocaleString()}</p>
        </div>
      </div>

      <TrafficExplorer
        stats={stats}
        pending={pending}
        error={error}
        onRangeChange={(from, to) => {
          rangeRef.current = { from, to };
          void load(from, to);
        }}
      />

      <div className="border-t border-blue-100 p-5">
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
                  {row.countryName} <span className="text-xs text-blue-400">{row.country}</span>
                </span>
                <span className="font-semibold text-emerald-700">{row.visitors}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-blue-400">Nobody live right now.</p>
        )}
      </div>
    </section>
  );
}
