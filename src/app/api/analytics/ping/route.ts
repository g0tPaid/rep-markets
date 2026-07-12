import { NextResponse } from 'next/server';

import { countryFromRequest } from '@/lib/geo';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanVisitorId(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) return null;
  return trimmed;
}

function cleanPath(value: unknown) {
  if (typeof value !== 'string') return '/';
  const trimmed = value.trim().slice(0, 300);
  if (!trimmed.startsWith('/')) return '/';
  if (trimmed.startsWith('/admin') || trimmed.startsWith('/api')) return null;
  return trimmed;
}

export async function POST(request: Request) {
  let body: { visitorId?: string; path?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const visitorId = cleanVisitorId(body.visitorId);
  const path = cleanPath(body.path);
  if (!visitorId || !path) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { code, name } = countryFromRequest(request);
  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.siteVisitor.upsert({
        where: { visitorId },
        create: {
          visitorId,
          country: code,
          countryName: name,
          hitCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        update: {
          lastSeenAt: now,
          hitCount: { increment: 1 },
          ...(code
            ? {
                country: code,
                countryName: name,
              }
            : {}),
        },
      }),
      prisma.pageView.create({
        data: {
          path,
          sessionId: visitorId,
          country: code,
        },
      }),
    ]);
  } catch (error) {
    console.error('visitor ping failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
