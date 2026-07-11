import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

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

export async function saveUploadedImage(file: File | null | undefined, folder = 'products') {
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, WEBP, or GIF images are allowed.');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 8MB or smaller.');
  }

  const ext = extensionFor(file.type, file.name);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const relativeDir = path.join('uploads', folder);
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

  await mkdir(absoluteDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, filename), buffer);

  return `/${relativeDir.replace(/\\/g, '/')}/${filename}`;
}
