import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;

function extensionFor(type: string, filename: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  const fromName = path.extname(filename).replace('.', '').toLowerCase();
  return fromName || 'jpg';
}

/** Optional local/volume mirror — DB is the source of truth. */
export function getUploadRoot() {
  return (
    process.env.UPLOAD_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    path.join(process.cwd(), 'uploads')
  );
}

export function publicUrlForStoredFile(id: string) {
  return `/api/media/f/${id}`;
}

function safeJoin(root: string, ...parts: string[]) {
  const resolved = path.resolve(root, ...parts);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  return resolved;
}

async function mirrorToDisk(buffer: Buffer, folder: string, filename: string) {
  try {
    const absoluteDir = safeJoin(getUploadRoot(), folder);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(path.join(absoluteDir, filename), buffer);
  } catch (error) {
    console.warn('disk mirror skipped', error);
  }
}

export async function saveUploadedImage(file: File | null | undefined, folder = 'products') {
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  const type = file.type || '';
  const extGuess = path.extname(file.name).replace('.', '').toLowerCase();
  const allowedByExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extGuess);
  const allowedByType = ALLOWED_TYPES.has(type) || (type === 'application/octet-stream' && allowedByExt);

  if (!allowedByType && !allowedByExt) {
    throw new Error('Only JPG, PNG, WEBP, or GIF images are allowed.');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 8MB or smaller.');
  }

  const mimeType = ALLOWED_TYPES.has(type) ? type : extensionFor(type, file.name) === 'png'
    ? 'image/png'
    : extensionFor(type, file.name) === 'webp'
      ? 'image/webp'
      : extensionFor(type, file.name) === 'gif'
        ? 'image/gif'
        : 'image/jpeg';

  const ext = extensionFor(mimeType, file.name);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const stored = await prisma.storedFile.create({
    data: {
      mimeType,
      bytes: buffer,
      size: buffer.byteLength,
      filename: `${folder}/${filename}`,
    },
  });

  // Best-effort local copy (helps if a Railway volume is mounted).
  await mirrorToDisk(buffer, folder, filename);

  return publicUrlForStoredFile(stored.id);
}

export async function resolveUploadAbsolutePath(relativeParts: string[]) {
  const cleaned = relativeParts.map((part) => part.replace(/\\/g, '/')).filter(Boolean);
  if (!cleaned.length || cleaned.some((part) => part.includes('..'))) {
    return null;
  }

  try {
    const primary = safeJoin(getUploadRoot(), ...cleaned);
    if (existsSync(primary)) return primary;

    const legacy = safeJoin(path.join(process.cwd(), 'public', 'uploads'), ...cleaned);
    if (existsSync(legacy)) return legacy;
  } catch {
    return null;
  }

  return null;
}

export async function getStoredFile(id: string) {
  if (!id || id.includes('..') || id.includes('/')) return null;
  return prisma.storedFile.findUnique({ where: { id } });
}
