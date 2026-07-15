'use client';

import { useEffect, useId, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImageCropDialog } from '@/components/admin/image-crop-dialog';
import { compressImageForUpload, rotateImageClockwise } from '@/lib/compress-image';
import { cn } from '@/lib/utils';

export type GalleryItem = {
  key: string;
  url: string;
  file: File | null;
  preview: string;
};

type ProductImageGalleryProps = {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  max?: number;
};

const MAX_BYTES = 8 * 1024 * 1024;
/** Matches product cards / gallery tiles */
const PRODUCT_ASPECT = 4 / 5;

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createGalleryItem(input: { url?: string; file?: File | null; preview?: string }): GalleryItem {
  const file = input.file ?? null;
  const preview = input.preview || input.url || (file ? URL.createObjectURL(file) : '');
  return {
    key: makeKey(),
    url: input.url || '',
    file,
    preview,
  };
}

export function ProductImageGallery({ items, onChange, max = 15 }: ProductImageGalleryProps) {
  const bulkId = useId();
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [cropping, setCropping] = useState<GalleryItem | null>(null);

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      });
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setItems(next: GalleryItem[]) {
    onChange(next.slice(0, max));
  }

  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!incoming.length) return;

    const room = max - items.length;
    if (room <= 0) {
      setError(`You already have ${max} images.`);
      return;
    }

    const slice = incoming.slice(0, room);
    setPreparing(true);
    setError(
      incoming.length > room
        ? `Only ${room} more image${room === 1 ? '' : 's'} can be added (max ${max}).`
        : '',
    );

    try {
      const accepted: GalleryItem[] = [];
      for (const file of slice) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} is larger than 8MB.`);
          continue;
        }
        // Crush on pick so Save only uploads small files
        const crushed = await compressImageForUpload(file);
        const preview = URL.createObjectURL(crushed);
        accepted.push(createGalleryItem({ file: crushed, preview }));
      }

      if (accepted.length) {
        setItems([...items, ...accepted]);
        if (incoming.length <= room) setError('');
      }
    } finally {
      setPreparing(false);
    }
  }

  function handleBulk(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addFiles(event.target.files);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) void addFiles(event.dataTransfer.files);
  }

  function removeAt(index: number) {
    const target = items[index];
    if (target?.preview.startsWith('blob:')) URL.revokeObjectURL(target.preview);
    setItems(items.filter((_, i) => i !== index));
    setError('');
  }

  function makeCover(index: number) {
    if (index <= 0) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setItems(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setItems(next);
  }

  async function finishCrop(file: File) {
    if (!cropping) return;
    const key = cropping.key;
    setCropping(null);
    setPreparing(true);
    try {
      const crushed = await compressImageForUpload(file);
      const preview = URL.createObjectURL(crushed);
      const cropped = createGalleryItem({ file: crushed, preview });
      setItems(
        items.map((item) => {
          if (item.key !== key) return item;
          if (item.preview.startsWith('blob:') && item.preview !== preview) {
            URL.revokeObjectURL(item.preview);
          }
          return cropped;
        }),
      );
      setError('');
    } finally {
      setPreparing(false);
    }
  }

  async function rotateAt(index: number) {
    const target = items[index];
    if (!target || preparing) return;
    setPreparing(true);
    setError('');
    try {
      const source = target.file || target.preview || target.url;
      if (!source) {
        setError('No image to rotate.');
        return;
      }
      const rotated = await rotateImageClockwise(
        source,
        target.file?.name || `product-${index + 1}.jpg`,
      );
      const crushed = await compressImageForUpload(rotated);
      const preview = URL.createObjectURL(crushed);
      const nextItem = createGalleryItem({ file: crushed, preview });
      setItems(
        items.map((item, i) => {
          if (i !== index) return item;
          if (item.preview.startsWith('blob:') && item.preview !== preview) {
            URL.revokeObjectURL(item.preview);
          }
          return nextItem;
        }),
      );
    } catch {
      setError('Could not rotate that image. Try again.');
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={bulkId}
          className={cn(
            'cursor-pointer bg-black px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-white',
            preparing && 'pointer-events-none opacity-60',
          )}
        >
          {preparing ? 'OPTIMIZING…' : 'CHOOSE MULTIPLE PHOTOS'}
        </label>
        <input
          id={bulkId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={preparing}
          onChange={handleBulk}
          className="sr-only"
        />
        <p className="text-sm text-black/55">
          {items.length}/{max} · first = cover · crop / rotate under each photo
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          'border border-dashed px-4 py-8 text-center transition',
          dragging ? 'border-black bg-neutral-100' : 'border-black/20 bg-neutral-50',
        )}
      >
        <p className="text-sm text-black/60">
          Drag &amp; drop up to {max} images here, or use{' '}
          <span className="font-medium text-black">Choose multiple photos</span>
        </p>
        <p className="mt-1 text-xs text-black/45">
          Photos add as-is. Use <span className="font-medium text-black">EDIT · CROP</span> or{' '}
          <span className="font-medium text-black">ROTATE</span> under any picture when needed.
        </p>
      </div>

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item, index) => (
            <div key={item.key} className="overflow-hidden border border-black/15 bg-white">
              <div className="relative aspect-[4/5] bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`Product image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 bg-black px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
                    COVER
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 border-t border-black/10 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCropping(item)}
                    disabled={preparing}
                    className="bg-black px-2 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-white disabled:opacity-50"
                  >
                    EDIT · CROP
                  </button>
                  <button
                    type="button"
                    onClick={() => void rotateAt(index)}
                    disabled={preparing}
                    className="border border-black bg-white px-2 py-2.5 text-[11px] font-semibold tracking-[0.14em] disabled:opacity-50"
                  >
                    ROTATE
                  </button>
                </div>
                <p className="truncate text-xs text-black/55">
                  {item.file?.name || (item.url ? 'Saved' : `Image ${index + 1}`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      className="border border-black px-2 py-1 text-[10px] font-semibold tracking-[0.12em]"
                    >
                      MAKE COVER
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="border border-black/15 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="border border-black/15 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] disabled:opacity-30"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="border border-red-600 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-red-700"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {cropping ? (
        <ImageCropDialog
          open
          imageSrc={cropping.preview}
          fileName={cropping.file?.name || 'product.jpg'}
          aspect={PRODUCT_ASPECT}
          title="Crop product photo"
          hint="Frame the product — 4:5 matches the shop cards. Drag to reposition, zoom if needed."
          onCancel={() => setCropping(null)}
          onComplete={(file) => {
            void finishCrop(file);
          }}
        />
      ) : null}
    </div>
  );
}
