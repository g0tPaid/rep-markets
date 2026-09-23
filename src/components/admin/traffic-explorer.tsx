'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Globe2 } from 'lucide-react';

import { VisitorWorldMap } from '@/components/admin/visitor-world-map';
import { countryLabel, flagEmoji } from '@/lib/analytics-geo';
import type { DayStat, VisitorAnalytics } from '@/lib/visitor-analytics';
import { cn } from '@/lib/utils';

type Preset = 'today' | '7d' | '30d' | 'all' | 'custom';

type ExplorerStats = Pick<
  VisitorAnalytics,
  | 'from'
  | 'to'
  | 'minDate'
  | 'maxDate'
  | 'history'
  | 'days'
  | 'hours'
  | 'countries'
  | 'range'
  | 'peakHour'
>;

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

function shiftUtcDate(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function clamp(key: string, minDate: string, maxDate: string): string {
  if (key < minDate) return minDate;
  if (key > maxDate) return maxDate;
  return key;
}

function formatDayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatHourRange(hour: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hour)}:00–${pad((hour + 1) % 24)}:00 UTC`;
}

function weekdayIndex(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function detectPreset(from: string, to: string, minDate: string, maxDate: string): Preset {
  if (from === maxDate && to === maxDate) return 'today';
  if (from === clamp(shiftUtcDate(maxDate, -6), minDate, maxDate) && to === maxDate) return '7d';
  if (from === clamp(shiftUtcDate(maxDate, -29), minDate, maxDate) && to === maxDate) return '30d';
  if (from === minDate && to === maxDate) return 'all';
  return 'custom';
}

function BarChart({
  items,
  emptyLabel,
}: {
  items: { key: string; label: string; value: number; title?: string }[];
  emptyLabel: string;
}) {
  const max = Math.max(0, ...items.map((item) => item.value));
  if (items.length === 0 || max === 0) {
    return (
      <p className="border border-blue-100 bg-blue-50/40 px-4 py-6 text-sm text-blue-400">{emptyLabel}</p>
    );
  }

  return (
    <div className="flex h-40 items-end gap-px border border-blue-100 bg-white px-3 py-3 sm:gap-0.5">
      {items.map((item) => {
        const height = Math.max(item.value > 0 ? 6 : 2, Math.round((item.value / max) * 112));
        return (
          <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full bg-blue-600/80"
              style={{ height }}
              title={item.title ?? `${item.label}: ${formatCount(item.value)}`}
            />
            <span className="max-w-full truncate text-[9px] leading-none text-blue-400">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TrafficExplorer({
  stats,
  pending,
  error,
  onRangeChange,
}: {
  stats: ExplorerStats;
  pending: boolean;
  error: string | null;
  onRangeChange: (from: string, to: string) => void;
}) {
  const preset = detectPreset(stats.from, stats.to, stats.minDate, stats.maxDate);
  const historyByDate = useMemo(() => {
    const map = new Map<string, DayStat>();
    for (const day of stats.history) map.set(day.date, day);
    return map;
  }, [stats.history]);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = stats.to.split('-').map(Number);
    return { year, month: month - 1 };
  });

  useEffect(() => {
    const [year, month] = stats.to.split('-').map(Number);
    setCalendarMonth({ year, month: month - 1 });
  }, [stats.to]);

  const topCountry = stats.countries[0] ?? null;
  const tableCountries = stats.countries.slice(0, 15);

  function rangeForPreset(next: Exclude<Preset, 'custom'>): { from: string; to: string } {
    const { minDate, maxDate } = stats;
    if (next === 'today') return { from: maxDate, to: maxDate };
    if (next === '7d') return { from: clamp(shiftUtcDate(maxDate, -6), minDate, maxDate), to: maxDate };
    if (next === '30d') return { from: clamp(shiftUtcDate(maxDate, -29), minDate, maxDate), to: maxDate };
    return { from: minDate, to: maxDate };
  }

  function loadRange(from: string, to: string) {
    const nextFrom = clamp(from, stats.minDate, stats.maxDate);
    const nextTo = clamp(to, stats.minDate, stats.maxDate);
    const ordered = nextFrom <= nextTo ? { from: nextFrom, to: nextTo } : { from: nextTo, to: nextFrom };
    if (ordered.from === stats.from && ordered.to === stats.to) return;
    onRangeChange(ordered.from, ordered.to);
  }

  const calendarCells = useMemo(() => {
    const first = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-01`;
    const startPad = weekdayIndex(first);
    const daysInMonth = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + 1, 0)).getUTCDate();
    const cells: ({ date: string; pageviews: number; uniques: number } | null)[] = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const row = historyByDate.get(date);
      cells.push({ date, pageviews: row?.pageviews ?? 0, uniques: row?.uniques ?? 0 });
    }
    return cells;
  }, [calendarMonth, historyByDate]);

  const maxCalendarViews = Math.max(1, ...calendarCells.map((cell) => cell?.pageviews ?? 0));

  function shiftMonth(delta: number) {
    setCalendarMonth((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  const hourItems = stats.hours.map((value, hour) => ({
    key: String(hour),
    label: hour % 3 === 0 ? String(hour) : '',
    value,
    title: `${formatHourRange(hour)}: ${formatCount(value)} pageviews`,
  }));

  const dayItems = stats.days.map((day) => ({
    key: day.date,
    label: formatDayLabel(day.date),
    value: day.pageviews,
    title: `${day.date}: ${formatCount(day.pageviews)} pageviews, ${formatCount(day.uniques)} unique`,
  }));

  return (
    <div className="space-y-6 border-t border-blue-100 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['today', 'Today'],
            ['7d', 'Last 7 days'],
            ['30d', 'Last 30 days'],
            ['all', 'All time'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              const next = rangeForPreset(id);
              loadRange(next.from, next.to);
            }}
            className={cn(
              'border px-3 py-1.5 text-xs transition',
              preset === id
                ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                : 'border-blue-200 text-blue-400 hover:border-blue-400 hover:text-blue-700',
            )}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-blue-400">
          From
          <input
            type="date"
            min={stats.minDate}
            max={stats.maxDate}
            value={stats.from}
            onChange={(event) => {
              if (!event.target.value) return;
              loadRange(event.target.value, stats.to);
            }}
            className="border border-blue-200 bg-white px-2 py-1 text-blue-800"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-blue-400">
          To
          <input
            type="date"
            min={stats.minDate}
            max={stats.maxDate}
            value={stats.to}
            onChange={(event) => {
              if (!event.target.value) return;
              loadRange(stats.from, event.target.value);
            }}
            className="border border-blue-200 bg-white px-2 py-1 text-blue-800"
          />
        </label>
      </div>

      <div className="border border-blue-100 bg-blue-50/40 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">{formatCount(stats.range.pageviews)}</span>
          <span className="text-blue-400"> pageviews · </span>
          <span className="font-semibold">{formatCount(stats.range.uniques)}</span>
          <span className="text-blue-400"> unique visitors</span>
          {stats.peakHour !== null ? (
            <>
              <span className="text-blue-400"> · most visits </span>
              <span className="font-semibold">{formatHourRange(stats.peakHour)}</span>
            </>
          ) : null}
          {topCountry ? (
            <>
              <span className="text-blue-400"> · mostly from </span>
              <span className="font-semibold">
                {flagEmoji(topCountry.code)} {topCountry.name || countryLabel(topCountry.code)}
              </span>
            </>
          ) : null}
        </p>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        {pending ? <p className="mt-2 text-xs text-blue-400">Loading range…</p> : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" aria-hidden />
            <h3 className="text-sm font-semibold text-blue-700">Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="border border-blue-200 px-2 py-1 text-xs text-blue-400 hover:text-blue-700"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="min-w-[9rem] text-center text-sm text-blue-800">
              {formatMonthLabel(calendarMonth.year, calendarMonth.month)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="border border-blue-200 px-2 py-1 text-xs text-blue-400 hover:text-blue-700"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>
        <div className="overflow-hidden border border-blue-200 bg-white p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-blue-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell) return <div key={`pad-${index}`} />;
              const disabled = cell.date < stats.minDate || cell.date > stats.maxDate;
              const selected = cell.date >= stats.from && cell.date <= stats.to;
              const intensity = cell.pageviews / maxCalendarViews;
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={disabled}
                  onClick={() => loadRange(cell.date, cell.date)}
                  title={`${cell.date}: ${formatCount(cell.pageviews)} pageviews, ${formatCount(cell.uniques)} unique`}
                  className={cn(
                    'flex h-11 flex-col items-center justify-center text-xs transition disabled:opacity-30',
                    selected ? 'ring-1 ring-blue-600' : 'hover:bg-blue-50',
                  )}
                  style={{
                    backgroundColor:
                      cell.pageviews > 0
                        ? `color-mix(in oklab, #2563eb ${Math.round(12 + intensity * 55)}%, white)`
                        : undefined,
                  }}
                >
                  <span className="font-medium text-blue-800">{Number(cell.date.slice(8))}</span>
                  <span className="text-[10px] text-blue-500">
                    {cell.pageviews > 0 ? formatCount(cell.pageviews) : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-blue-400">
          Pageview intensity by UTC day. Click a day to filter that date.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-blue-700">Visits by day</h3>
          <BarChart items={dayItems} emptyLabel="No pageviews in this range." />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-blue-600" aria-hidden />
            <h3 className="text-sm font-semibold text-blue-700">Visits by hour (UTC)</h3>
          </div>
          <BarChart items={hourItems} emptyLabel="No hourly data in this range yet." />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-blue-600" aria-hidden />
            <h3 className="text-sm font-semibold text-blue-700">Visitors by country</h3>
          </div>
          <VisitorWorldMap countries={stats.countries} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-blue-700">Top countries</h3>
          {tableCountries.length === 0 ? (
            <p className="border border-blue-100 bg-blue-50/40 px-4 py-6 text-sm text-blue-400">
              No country data yet.
            </p>
          ) : (
            <div className="overflow-hidden border border-blue-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-blue-100 text-xs uppercase tracking-wide text-blue-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Country</th>
                    <th className="px-4 py-2 font-medium">Visits</th>
                    <th className="px-4 py-2 font-medium">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {tableCountries.map((row) => (
                    <tr key={row.code} className="border-b border-blue-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="mr-2" aria-hidden>
                          {flagEmoji(row.code)}
                        </span>
                        <span className="font-medium text-blue-800">{row.code}</span>
                        <span className="ml-2 text-blue-400">{row.name || countryLabel(row.code)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-blue-800">{formatCount(row.visits)}</td>
                      <td className="px-4 py-2.5 text-blue-800">{formatCount(row.pageviews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
