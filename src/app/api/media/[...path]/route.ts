import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { getStoredFileByLegacyPath, resolveUploadAbsolutePath } from '@/lib/uploads';

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

  // 1) Disk / volume (if Railway volume still has the file)
  const absolute = await resolveUploadAbsolutePath(parts);
  if (absolute) {
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
      // fall through to DB lookup
    }
  }

  // 2) Postgres stored_files matched by legacy filename (products/xxx.jpg)
  const stored = await getStoredFileByLegacyPath(parts);
  if (stored) {
    return new NextResponse(new Uint8Array(stored.bytes), {
      headers: {
        'Content-Type': stored.mimeType,
        'Content-Length': String(stored.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
