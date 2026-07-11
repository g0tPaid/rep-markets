import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

/** Persistent disk when Railway volume is mounted; otherwise local ./uploads. */
export function getUploadRoot() {
  return (
    process.env.UPLOAD_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    path.join(process.cwd(), 'uploads')
  );
}

export function publicUrlFor(folder: string, filename: string) {
  return `/api/media/${folder}/${filename}`;
}

function safeJoin(root: string, ...parts: string[]) {
  const resolved = path.resolve(root, ...parts);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('Invalid upload path.');
  }
  return resolved;
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

  const ext = extensionFor(type, file.name);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const absoluteDir = safeJoin(getUploadRoot(), folder);
  await mkdir(absoluteDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, filename), buffer);

  return publicUrlFor(folder, filename);
}

export async function resolveUploadAbsolutePath(relativeParts: string[]) {
  const cleaned = relativeParts.map((part) => part.replace(/\\/g, '/')).filter(Boolean);
  if (!cleaned.length || cleaned.some((part) => part.includes('..'))) {
    return null;
  }

  const primary = safeJoin(getUploadRoot(), ...cleaned);
  if (existsSync(primary)) return primary;

  const legacy = safeJoin(path.join(process.cwd(), 'public', 'uploads'), ...cleaned);
  if (existsSync(legacy)) return legacy;

  return null;
}
