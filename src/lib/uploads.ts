import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createHash, randomUUID } from 'crypto';

import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;
/** Cap stored image edge — smaller BYTEA = much faster Postgres writes on Railway. */
const MAX_EDGE = 1100;
const WEBP_QUALITY = 68;

function extensionFor(type: string, filename: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  const fromName = path.extname(filename).replace('.', '').toLowerCase();
  return fromName || 'jpg';
}

/** Optional local/volume mirror — DB is the source of truth (unless Cloudinary is configured). */
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

function cloudinaryConfigured() {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

/** Fast durable path — CDN URL, no Postgres BYTEA. */
async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  filename: string,
): Promise<string | null> {
  const cfg = cloudinaryConfigured();
  if (!cfg) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = filename.replace(/\.[^.]+$/, '');
  const cloudFolder = `rep-markets/${folder}`;
  const params = {
    folder: cloudFolder,
    public_id: publicId,
    timestamp,
  };
  const signature = signCloudinaryParams(params, cfg.apiSecret);

  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  body.append('api_key', cfg.apiKey);
  body.append('timestamp', String(timestamp));
  body.append('signature', signature);
  body.append('folder', cloudFolder);
  body.append('public_id', publicId);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.warn('cloudinary upload failed', response.status, text.slice(0, 200));
    return null;
  }

  const json = (await response.json()) as { secure_url?: string };
  return json.secure_url || null;
}

function safeJoin(root: string, ...parts: string[]) {
  const resolved = path.resolve(root, ...parts);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  return resolved;
}

function cachePathForId(id: string) {
  return safeJoin(getUploadRoot(), 'cache', id);
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

async function writeServeCache(id: string, buffer: Buffer) {
  try {
    const filePath = cachePathForId(id);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  } catch {
    // cache is best-effort
  }
}

export async function readServeCache(id: string) {
  try {
    const filePath = cachePathForId(id);
    if (!existsSync(filePath)) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/**
 * Re-encode before Postgres BYTEA write. Client compress helps, but this is the
 * safety net for large phone photos / failed canvas compress.
 */
async function optimizeForStorage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  if (mimeType === 'image/gif') {
    return { buffer, mimeType, ext: 'gif' };
  }

  // Already tiny — skip CPU work
  if (buffer.byteLength <= 140_000 && mimeType === 'image/webp') {
    return { buffer, mimeType, ext: 'webp' };
  }
  if (buffer.byteLength <= 160_000 && mimeType === 'image/jpeg') {
    return { buffer, mimeType, ext: 'jpg' };
  }

  try {
    const sharp = (await import('sharp')).default;
    const webp = await sharp(buffer, { failOn: 'none', animated: false })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 3 })
      .toBuffer();

    if (webp.byteLength > 0 && webp.byteLength < buffer.byteLength) {
      return { buffer: webp, mimeType: 'image/webp', ext: 'webp' };
    }

    if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
      const jpeg = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      if (jpeg.byteLength > 0 && jpeg.byteLength < buffer.byteLength) {
        return { buffer: jpeg, mimeType: 'image/jpeg', ext: 'jpg' };
      }
    }

    return { buffer, mimeType, ext: extensionFor(mimeType, 'x') };
  } catch (error) {
    console.warn('image optimize skipped', error);
    return { buffer, mimeType, ext: extensionFor(mimeType, 'x') };
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

  const mimeType = ALLOWED_TYPES.has(type)
    ? type
    : extensionFor(type, file.name) === 'png'
      ? 'image/png'
      : extensionFor(type, file.name) === 'webp'
        ? 'image/webp'
        : extensionFor(type, file.name) === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

  const raw = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeForStorage(raw, mimeType);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${optimized.ext}`;

  // Prefer Cloudinary when configured — avoids slow Postgres BYTEA round-trips
  const cloudUrl = await uploadToCloudinary(
    optimized.buffer,
    optimized.mimeType,
    folder,
    filename,
  );
  if (cloudUrl) return cloudUrl;

  const stored = await prisma.storedFile.create({
    data: {
      mimeType: optimized.mimeType,
      bytes: optimized.buffer,
      size: optimized.buffer.byteLength,
      filename: `${folder}/${filename}`,
    },
    select: { id: true },
  });

  // Warm local serve-cache + optional volume mirror without blocking the upload response
  void writeServeCache(stored.id, optimized.buffer);
  void mirrorToDisk(optimized.buffer, folder, filename);

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
  return prisma.storedFile.findUnique({
    where: { id },
    select: { id: true, mimeType: true, bytes: true, size: true, filename: true },
  });
}

/** Match legacy `/api/media/products/foo.jpg` paths to DB rows saved with that filename. */
export async function getStoredFileByLegacyPath(parts: string[]) {
  const cleaned = parts.map((part) => part.replace(/\\/g, '/')).filter(Boolean);
  if (!cleaned.length || cleaned.some((part) => part.includes('..'))) {
    return null;
  }

  const filename = cleaned.join('/');
  const basename = cleaned[cleaned.length - 1];

  const byFull = await prisma.storedFile.findFirst({
    where: { filename },
    orderBy: { createdAt: 'desc' },
    select: { id: true, mimeType: true, bytes: true, size: true, filename: true },
  });
  if (byFull) return byFull;

  return prisma.storedFile.findFirst({
    where: {
      OR: [{ filename: { endsWith: `/${basename}` } }, { filename: basename }],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, mimeType: true, bytes: true, size: true, filename: true },
  });
}

export function isDurableMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith('/api/media/f/') || /^https?:\/\//i.test(url);
}

export function isLegacyDiskMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  return (
    (url.startsWith('/api/media/') && !url.startsWith('/api/media/f/')) ||
    url.startsWith('/uploads/')
  );
}
