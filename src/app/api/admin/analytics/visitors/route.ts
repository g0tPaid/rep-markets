import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getVisitorAnalytics, parseDateKey } from '@/lib/visitor-analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const stats = await getVisitorAnalytics({
    from: parseDateKey(url.searchParams.get('from')),
    to: parseDateKey(url.searchParams.get('to')),
  });

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
