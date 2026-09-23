import { countryLabel } from '@/lib/analytics-geo';
import { LIVE_WINDOW_MS } from '@/lib/geo';
import { prisma } from '@/lib/prisma';

export type PeriodStats = {
  pageviews: number;
  uniques: number;
};

export type DayStat = {
  date: string;
  pageviews: number;
  uniques: number;
};

export type CountryStat = {
  code: string;
  name: string;
  visits: number;
  pageviews: number;
};

export type CountryVisitorRow = {
  country: string;
  countryName: string;
  visitors: number;
};

export type VisitorAnalytics = {
  totalVisitors: number;
  liveVisitors: number;
  pageViewsToday: number;
  pageViewsYesterday: number;
  pageViewsTotal: number;
  uniqueVisitorsToday: number;
  uniqueVisitorsYesterday: number;
  byCountry: CountryVisitorRow[];
  liveByCountry: CountryVisitorRow[];
  liveWindowSeconds: number;
  range: PeriodStats;
  from: string;
  to: string;
  days: DayStat[];
  history: DayStat[];
  hours: number[];
  peakHour: number | null;
  countries: CountryStat[];
  minDate: string;
  maxDate: string;
  error?: string;
};

export type VisitorAnalyticsQuery = {
  from?: string | null;
  to?: string | null;
};

const EMPTY_HOURS = () => Array.from({ length: 24 }, () => 0);

export function parseDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

export function utcDateKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function shiftUtcDate(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function clampDateKey(key: string, minDate: string, maxDate: string): string {
  if (key < minDate) return minDate;
  if (key > maxDate) return maxDate;
  return key;
}

function dateKeysInclusive(from: string, to: string): string[] {
  const keys: string[] = [];
  let key = from;
  while (key <= to && keys.length < 5000) {
    keys.push(key);
    key = shiftUtcDate(key, 1);
  }
  return keys;
}

function rangeBounds(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return {
    start: new Date(Date.UTC(fy, fm - 1, fd)),
    end: new Date(Date.UTC(ty, tm - 1, td + 1)),
  };
}

function num(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function peakHourFrom(hours: number[]): number | null {
  let peak = 0;
  let max = 0;
  for (let i = 0; i < hours.length; i += 1) {
    if (hours[i] > max) {
      max = hours[i];
      peak = i;
    }
  }
  return max > 0 ? peak : null;
}

function emptyAnalytics(error?: string): VisitorAnalytics {
  const today = utcDateKey(new Date());
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
    liveWindowSeconds: Math.round(LIVE_WINDOW_MS / 1000),
    range: { pageviews: 0, uniques: 0 },
    from: today,
    to: today,
    days: [{ date: today, pageviews: 0, uniques: 0 }],
    history: [],
    hours: EMPTY_HOURS(),
    peakHour: null,
    countries: [],
    minDate: today,
    maxDate: today,
    ...(error ? { error } : {}),
  };
}

type HistoryRow = { date: string; pageviews: unknown; uniques: unknown };
type HourRow = { hour: unknown; pageviews: unknown };
type CountryRow = { code: string; visits: unknown; pageviews: unknown };
type RangeRow = { pageviews: unknown; uniques: unknown };

export async function getVisitorAnalytics(
  query: VisitorAnalyticsQuery = {},
): Promise<VisitorAnalytics> {
  const now = new Date();
  const todayKey = utcDateKey(now);
  const yesterdayKey = shiftUtcDate(todayKey, -1);
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);

  try {
    const [totalVisitors, liveVisitors, byCountryRaw, liveByCountryRaw, historyRaw] =
      await Promise.all([
        prisma.siteVisitor.count(),
        prisma.siteVisitor.count({ where: { lastSeenAt: { gte: liveSince } } }),
        prisma.siteVisitor.groupBy({
          by: ['country', 'countryName'],
          _count: { _all: true },
        }),
        prisma.siteVisitor.groupBy({
          by: ['country', 'countryName'],
          where: { lastSeenAt: { gte: liveSince } },
          _count: { _all: true },
        }),
        prisma.$queryRaw<HistoryRow[]>`
          SELECT
            to_char("createdAt", 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS pageviews,
            COUNT(DISTINCT "sessionId")::int AS uniques
          FROM "page_views"
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

    const history: DayStat[] = historyRaw.map((row) => ({
      date: String(row.date),
      pageviews: num(row.pageviews),
      uniques: num(row.uniques),
    }));
    const historyByDate = new Map(history.map((day) => [day.date, day]));

    const lastData = history.at(-1)?.date ?? todayKey;
    const maxDate = lastData > todayKey ? lastData : todayKey;
    const minDate = history[0]?.date ?? maxDate;

    let from = clampDateKey(
      parseDateKey(query.from) ?? shiftUtcDate(maxDate, -6),
      minDate,
      maxDate,
    );
    let to = clampDateKey(parseDateKey(query.to) ?? maxDate, minDate, maxDate);
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }

    const { start, end } = rangeBounds(from, to);
    const [hourRaw, countryRaw, rangeRaw] = await Promise.all([
      prisma.$queryRaw<HourRow[]>`
        SELECT
          EXTRACT(HOUR FROM "createdAt")::int AS hour,
          COUNT(*)::int AS pageviews
        FROM "page_views"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1
      `,
      prisma.$queryRaw<CountryRow[]>`
        SELECT
          CASE
            WHEN "country" IS NULL OR btrim("country") = '' THEN 'XX'
            ELSE upper(btrim("country"))
          END AS code,
          COUNT(DISTINCT "sessionId")::int AS visits,
          COUNT(*)::int AS pageviews
        FROM "page_views"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1
        ORDER BY visits DESC, pageviews DESC, code ASC
      `,
      prisma.$queryRaw<RangeRow[]>`
        SELECT
          COUNT(*)::int AS pageviews,
          COUNT(DISTINCT "sessionId")::int AS uniques
        FROM "page_views"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      `,
    ]);

    const hours = EMPTY_HOURS();
    for (const row of hourRaw) {
      const hour = num(row.hour);
      if (hour >= 0 && hour < 24) hours[hour] = num(row.pageviews);
    }

    const days = dateKeysInclusive(from, to).map(
      (date) => historyByDate.get(date) ?? { date, pageviews: 0, uniques: 0 },
    );
    const rangeTotals = rangeRaw[0];
    const today = historyByDate.get(todayKey);
    const yesterday = historyByDate.get(yesterdayKey);

    const byCountry = byCountryRaw
      .map((row) => ({
        country: row.country || 'XX',
        countryName: row.countryName || countryLabel(row.country || 'XX'),
        visitors: row._count._all,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    const liveByCountry = liveByCountryRaw
      .map((row) => ({
        country: row.country || 'XX',
        countryName: row.countryName || countryLabel(row.country || 'XX'),
        visitors: row._count._all,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    return {
      totalVisitors,
      liveVisitors,
      pageViewsToday: today?.pageviews ?? 0,
      pageViewsYesterday: yesterday?.pageviews ?? 0,
      pageViewsTotal: history.reduce((sum, day) => sum + day.pageviews, 0),
      uniqueVisitorsToday: today?.uniques ?? 0,
      uniqueVisitorsYesterday: yesterday?.uniques ?? 0,
      byCountry,
      liveByCountry,
      liveWindowSeconds: Math.round(LIVE_WINDOW_MS / 1000),
      range: {
        pageviews: num(rangeTotals?.pageviews),
        uniques: num(rangeTotals?.uniques),
      },
      from,
      to,
      days,
      history,
      hours,
      peakHour: peakHourFrom(hours),
      countries: countryRaw.map((row) => ({
        code: row.code || 'XX',
        name: countryLabel(row.code || 'XX'),
        visits: num(row.visits),
        pageviews: num(row.pageviews),
      })),
      minDate,
      maxDate,
    };
  } catch (error) {
    console.error('visitor analytics failed', error);
    return emptyAnalytics('Stats unavailable — run migrations if this is a fresh deploy.');
  }
}
