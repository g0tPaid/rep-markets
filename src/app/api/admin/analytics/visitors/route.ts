import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { LIVE_WINDOW_MS } from '@/lib/geo';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  try {
    const [
      totalVisitors,
      liveVisitors,
      byCountryRaw,
      pageViewsToday,
      pageViewsYesterday,
      pageViewsTotal,
      uniqueVisitorsToday,
      uniqueVisitorsYesterday,
      liveByCountryRaw,
    ] = await Promise.all([
        prisma.siteVisitor.count(),
        prisma.siteVisitor.count({ where: { lastSeenAt: { gte: liveSince } } }),
        prisma.siteVisitor.groupBy({
          by: ['country', 'countryName'],
          _count: { _all: true },
        }),
        prisma.pageView.count({
          where: {
            createdAt: { gte: todayStart },
          },
        }),
        prisma.pageView.count({
          where: {
            createdAt: { gte: yesterdayStart, lt: todayStart },
          },
        }),
        prisma.pageView.count(),
        prisma.siteVisitor.count({
          where: { lastSeenAt: { gte: todayStart } },
        }),
        prisma.siteVisitor.count({
          where: { lastSeenAt: { gte: yesterdayStart, lt: todayStart } },
        }),
        prisma.siteVisitor.groupBy({
          by: ['country', 'countryName'],
          where: { lastSeenAt: { gte: liveSince } },
          _count: { _all: true },
        }),
      ]);

    const byCountry = byCountryRaw
      .map((row) => ({
        country: row.country || 'XX',
        countryName: row.countryName || 'Unknown',
        visitors: row._count._all,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    const liveByCountry = liveByCountryRaw
      .map((row) => ({
        country: row.country || 'XX',
        countryName: row.countryName || 'Unknown',
        visitors: row._count._all,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    return NextResponse.json({
      totalVisitors,
      liveVisitors,
      pageViewsToday,
      pageViewsYesterday,
      pageViewsTotal,
      uniqueVisitorsToday,
      uniqueVisitorsYesterday,
      byCountry,
      liveByCountry,
      liveWindowSeconds: Math.round(LIVE_WINDOW_MS / 1000),
    });
  } catch (error) {
    console.error('visitor analytics failed', error);
    return NextResponse.json({
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
      error: 'Stats unavailable — run migrations if this is a fresh deploy.',
    });
  }
}
