import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { prisma } from '@/lib/prisma';
import { getUploadRoot, readServeCache } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mediaHeaders(mimeType: string, size: number, etag: string) {
  return {
    'Content-Type': mimeType,
    'Content-Length': String(size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || id.includes('..') || id.includes('/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const etag = `"${id}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const cached = await readServeCache(id);
  if (cached) {
    const meta = await prisma.storedFile.findUnique({
      where: { id },
      select: { mimeType: true },
    });
    return new NextResponse(cached, {
      headers: mediaHeaders(meta?.mimeType || 'image/jpeg', cached.byteLength, etag),
    });
  }

  const file = await prisma.storedFile.findUnique({
    where: { id },
    select: { mimeType: true, bytes: true, size: true },
  });

  if (!file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bytes = Buffer.from(file.bytes);

  void (async () => {
    try {
      const dir = path.join(getUploadRoot(), 'cache');
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, id), bytes);
    } catch {
      // ignore
    }
  })();

  return new NextResponse(bytes, {
    headers: mediaHeaders(file.mimeType, file.size, etag),
  });
}
