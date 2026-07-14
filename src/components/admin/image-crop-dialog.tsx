'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { cn } from '@/lib/utils';

type ImageCropDialogProps = {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  /** Width / height — e.g. 4/5 product, 12/5 banner */
  aspect: number;
  title?: string;
  hint?: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

async function canvasFromCrop(imageSrc: string, crop: Area): Promise<HTMLCanvasElement> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Could not load image for crop.')));
    // Blob URLs don't need CORS; remote/same-origin URLs do for canvas export
    if (!imageSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );

  return canvas;
}

/** Load any preview URL into a blob: src so crop + export always works. */
async function localImageSrc(imageSrc: string): Promise<{ src: string; revoke: boolean }> {
  if (imageSrc.startsWith('blob:')) {
    return { src: imageSrc, revoke: false };
  }
  const response = await fetch(imageSrc, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Could not load image for crop.');
  }
  const blob = await response.blob();
  return { src: URL.createObjectURL(blob), revoke: true };
}

async function fileFromCrop(
  imageSrc: string,
  crop: Area,
  fileName: string,
): Promise<File> {
  const canvas = await canvasFromCrop(imageSrc, crop);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Could not export cropped image.'));
      },
      'image/jpeg',
      0.92,
    );
  });

  const base = fileName.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}-crop.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export function ImageCropDialog({
  open,
  imageSrc,
  fileName = 'image.jpg',
  aspect,
  title = 'Crop image',
  hint,
  onCancel,
  onComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readySrc, setReadySrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReadySrc(null);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setBusy(false);
    setError('');
    setReadySrc(null);

    let revoked: string | null = null;
    let cancelled = false;

    void localImageSrc(imageSrc)
      .then(({ src, revoke }) => {
        if (cancelled) {
          if (revoke) URL.revokeObjectURL(src);
          return;
        }
        if (revoke) revoked = src;
        setReadySrc(src);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load image.');
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function confirm() {
    if (!croppedAreaPixels || busy || !readySrc) return;
    setBusy(true);
    setError('');
    try {
      const file = await fileFromCrop(readySrc, croppedAreaPixels, fileName);
      onComplete(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crop failed.');
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden border border-black/10 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-black">{title}</p>
            {hint ? <p className="mt-1 text-xs text-black/55">{hint}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-xs font-semibold tracking-[0.14em] text-black/50 hover:text-black disabled:opacity-40"
          >
            CLOSE
          </button>
        </div>

        <div className="relative h-[min(56vh,420px)] w-full bg-neutral-900">
          {readySrc ? (
            <Cropper
              image={readySrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              showGrid
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              {error || 'Loading image…'}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-black/10 px-4 py-4">
          <label className="block text-xs font-medium text-black/60">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-black"
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="border border-black/20 px-4 py-2.5 text-xs font-semibold tracking-[0.14em] disabled:opacity-40"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy || !croppedAreaPixels || !readySrc}
              className={cn(
                'bg-black px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-white disabled:opacity-50',
              )}
            >
              {busy ? 'CROPPING…' : 'USE CROP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
