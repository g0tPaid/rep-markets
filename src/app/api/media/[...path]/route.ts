import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { resolveUploadAbsolutePath } from '@/lib/uploads';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

export async function GET(_request: Request, context: RouteContext) {
  const { path: parts } = await context.params;
  const absolute = await resolveUploadAbsolutePath(parts);

  if (!absolute) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(absolute);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentTypeFor(absolute),
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
