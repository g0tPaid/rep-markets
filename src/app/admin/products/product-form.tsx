'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import type { ProductActionState } from '@/app/admin/actions/products';
import {
  createGalleryItem,
  ProductImageGallery,
  type GalleryItem,
} from '@/components/admin/product-image-gallery';
import { QUALITY_OPTIONS } from '@/lib/products';
import { cn } from '@/lib/utils';

type CategoryOption = {
  id: string;
  name: string;
  parentName?: string | null;
};

type ProductForForm = {
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  price: unknown;
  salePrice: unknown | null;
  qualityPrices?: Partial<Record<string, number | null>> | null;
  sku: string | null;
  stock: number;
  sizes: string[];
  colors: string[];
  tags: string[];
  weight: number | null;
  material: string | null;
  status: string;
  featured: boolean;
  newArrival: boolean;
  homepageOrder: number | null;
  categoryId: string | null;
  media: Array<{
    url: string;
    kind: string;
    sortOrder?: number;
  }>;
};

type ProductFormProps = {
  action: (state: ProductActionState, formData: FormData) => Promise<ProductActionState>;
  categories: CategoryOption[];
  product?: ProductForForm | null;
  submitLabel: string;
};

const statuses = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'HIDDEN'];
const IMAGE_SLOTS = 15;
const CLOTHES_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
const SHOE_EU = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const;
const SHOE_UK = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
const SHOE_US = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13'] as const;

function fieldValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function guessSizeMode(sizes: string[]): 'clothes' | 'shoes' {
  const joined = sizes.join(' ').toUpperCase();
  if (joined.includes('EU') || joined.includes('UK') || joined.includes('US') || /\b\d{2}\b/.test(joined)) {
    return 'shoes';
  }
  return 'clothes';
}

function parseSelectedSizes(sizes: string[], mode: 'clothes' | 'shoes') {
  if (mode === 'clothes') {
    return sizes.map((size) => size.toUpperCase()).filter((size) => CLOTHES_SIZES.includes(size as (typeof CLOTHES_SIZES)[number]));
  }

  const selected = new Set(sizes.map((size) => size.trim().toUpperCase()));
  return {
    eu: SHOE_EU.filter((size) => selected.has(`EU ${size}`) || selected.has(size)).map((size) => `EU ${size}`),
    uk: SHOE_UK.filter((size) => selected.has(`UK ${size}`)).map((size) => `UK ${size}`),
    us: SHOE_US.filter((size) => selected.has(`US ${size}`)).map((size) => `US ${size}`),
  };
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function uploadFile(file: File, onProgress: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append('file', file);

    xhr.open('POST', '/api/admin/upload');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || '{}') as { url?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
          resolve(payload.url);
          return;
        }
        reject(new Error(payload.error || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.send(body);
  });
}

/** Shrink large photos before upload so create feels faster. */
async function compressImage(file: File, maxEdge = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size < 400_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onItemDone?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let done = 0;

  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
      done += 1;
      onItemDone?.(done, items.length);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

function SizeChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-w-10 border px-3 py-2 text-xs font-medium',
        selected ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black',
      )}
    >
      {label}
    </button>
  );
}

export function ProductForm({ action, categories, product, submitLabel }: ProductFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState('');
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasPendingRef = useRef(false);

  const initialMode = guessSizeMode(product?.sizes ?? []);
  const [sizeMode, setSizeMode] = useState<'clothes' | 'shoes'>(initialMode);
  const initialParsed = parseSelectedSizes(product?.sizes ?? [], initialMode);
  const [clothesSizes, setClothesSizes] = useState<string[]>(
    Array.isArray(initialParsed) ? initialParsed : [],
  );
  const [shoeEu, setShoeEu] = useState<string[]>(Array.isArray(initialParsed) ? [] : initialParsed.eu);
  const [shoeUk, setShoeUk] = useState<string[]>(Array.isArray(initialParsed) ? [] : initialParsed.uk);
  const [shoeUs, setShoeUs] = useState<string[]>(Array.isArray(initialParsed) ? [] : initialParsed.us);

  const sortedMedia = useMemo(
    () => [...(product?.media ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [product?.media],
  );
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    sortedMedia
      .filter((item) => item.url)
      .slice(0, IMAGE_SLOTS)
      .map((item) => createGalleryItem({ url: item.url, preview: item.url })),
  );

  const selectedSizes =
    sizeMode === 'clothes' ? clothesSizes : [...shoeEu, ...shoeUk, ...shoeUs];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || pending) return;

    setClientError('');
    setSubmitting(true);
    setProgress({ pct: 4, label: 'Preparing…' });

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('sizes', selectedSizes.join(', '));

    try {
      const pendingUploads = gallery
        .map((item, index) => (item.file ? { item, index } : null))
        .filter(Boolean) as Array<{ item: GalleryItem; index: number }>;

      const urls = gallery.map((item) => item.url);

      if (pendingUploads.length) {
        setProgress({ pct: 8, label: `Optimizing ${pendingUploads.length} image(s)…` });
        const prepared = await Promise.all(
          pendingUploads.map(async ({ item, index }) => ({
            index,
            file: await compressImage(item.file as File),
          })),
        );

        let completed = 0;
        await mapPool(
          prepared,
          3,
          async ({ file, index }) => {
            const url = await uploadFile(file, () => {
              const pct = 10 + Math.round(((completed + 0.5) / prepared.length) * 75);
              setProgress({
                pct: Math.min(85, pct),
                label: `Uploading images… ${completed + 1}/${prepared.length}`,
              });
            });
            urls[index] = url;
            return url;
          },
          (done, total) => {
            completed = done;
            setProgress({
              pct: 10 + Math.round((done / total) * 75),
              label: `Uploaded ${done} of ${total}…`,
            });
          },
        );

        setGallery((current) =>
          current.map((item, index) =>
            urls[index]
              ? { ...item, url: urls[index], file: null, preview: urls[index] }
              : item,
          ),
        );
      }

      for (let index = 0; index < IMAGE_SLOTS; index += 1) {
        formData.delete(`image${index}`);
        formData.set(`existingImageUrl${index}`, urls[index] || '');
      }

      setProgress({ pct: 92, label: 'Saving product…' });
      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      setProgress(null);
      setSubmitting(false);
      setClientError(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;

    if (state.error) {
      setProgress(null);
    } else {
      setProgress({ pct: 100, label: 'Done' });
    }
    setSubmitting(false);
  }, [pending, state.error]);

  const error = clientError || state.error;
  const busy = submitting || pending;

  return (
    <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-8">
      {error ? (
        <div className="border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {progress ? (
        <div className="border border-black/10 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{progress.label}</span>
            <span className="font-medium">{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden bg-neutral-100">
            <div className="h-full bg-black transition-all duration-200" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="name">
            Product name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name ?? ''}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={product?.slug ?? ''}
            placeholder="auto-generated from name"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="sku">
            SKU
          </label>
          <input
            id="sku"
            name="sku"
            defaultValue={product?.sku ?? ''}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="brand">
            Brand
          </label>
          <input
            id="brand"
            name="brand"
            defaultValue={product?.brand ?? 'rep.markets'}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ''}
            className="mt-2 w-full border border-black/15 bg-white px-3 py-2 outline-none focus:border-black"
          >
            <option value="">Unassigned</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parentName ? `${category.parentName} / ${category.name}` : category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="shortDescription">
            Short description
          </label>
          <input
            id="shortDescription"
            name="shortDescription"
            defaultValue={product?.shortDescription ?? ''}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={product?.status ?? 'ACTIVE'}
            className="mt-2 w-full border border-black/15 bg-white px-3 py-2 outline-none focus:border-black"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="longDescription">
            Long description
          </label>
          <textarea
            id="longDescription"
            name="longDescription"
            rows={5}
            defaultValue={product?.longDescription ?? ''}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>
      </section>

      <section className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium" htmlFor="price">
            Price
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={fieldValue(product?.price)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="salePrice">
            Sale price
          </label>
          <input
            id="salePrice"
            name="salePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fieldValue(product?.salePrice)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div className="md:col-span-3">
          <p className="text-sm font-medium">Quality prices</p>
          <p className="mt-1 text-xs text-black/50">
            Leave blank to use automatic markup from the base price. Fill any tier to override.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUALITY_OPTIONS.map((option) => (
              <div key={option.id}>
                <label className="block text-xs font-medium text-black/70" htmlFor={`qualityPrice${option.id}`}>
                  {option.label}
                </label>
                <input
                  id={`qualityPrice${option.id}`}
                  name={`qualityPrice${option.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={option.multiplier === 1 ? 'Same as base' : `~${option.multiplier}x base`}
                  defaultValue={fieldValue(product?.qualityPrices?.[option.id])}
                  className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            defaultValue={product?.stock ?? 0}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div className="md:col-span-3">
          <p className="text-sm font-medium">Sizes</p>
          <input type="hidden" name="sizes" value={selectedSizes.join(', ')} readOnly />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSizeMode('clothes')}
              className={cn(
                'border px-4 py-2 text-xs font-semibold tracking-[0.14em]',
                sizeMode === 'clothes' ? 'border-black bg-black text-white' : 'border-black/15',
              )}
            >
              CLOTHES
            </button>
            <button
              type="button"
              onClick={() => setSizeMode('shoes')}
              className={cn(
                'border px-4 py-2 text-xs font-semibold tracking-[0.14em]',
                sizeMode === 'shoes' ? 'border-black bg-black text-white' : 'border-black/15',
              )}
            >
              SHOES
            </button>
          </div>

          {sizeMode === 'clothes' ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {CLOTHES_SIZES.map((size) => (
                <SizeChip
                  key={size}
                  label={size}
                  selected={clothesSizes.includes(size)}
                  onClick={() => setClothesSizes((current) => toggleValue(current, size))}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-black/55">EU</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_EU.map((size) => {
                    const value = `EU ${size}`;
                    return (
                      <SizeChip
                        key={value}
                        label={size}
                        selected={shoeEu.includes(value)}
                        onClick={() => setShoeEu((current) => toggleValue(current, value))}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-black/55">UK</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_UK.map((size) => {
                    const value = `UK ${size}`;
                    return (
                      <SizeChip
                        key={value}
                        label={size}
                        selected={shoeUk.includes(value)}
                        onClick={() => setShoeUk((current) => toggleValue(current, value))}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-black/55">US</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_US.map((size) => {
                    const value = `US ${size}`;
                    return (
                      <SizeChip
                        key={value}
                        label={size}
                        selected={shoeUs.includes(value)}
                        onClick={() => setShoeUs((current) => toggleValue(current, value))}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-black/50">
            Selected: {selectedSizes.length ? selectedSizes.join(', ') : 'none'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="colors">
            Colors
          </label>
          <input
            id="colors"
            name="colors"
            defaultValue={product?.colors.join(', ') ?? ''}
            placeholder="Black, Ivory"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={product?.tags.join(', ') ?? ''}
            placeholder="minimal, everyday"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="material">
            Material
          </label>
          <input
            id="material"
            name="material"
            defaultValue={product?.material ?? ''}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="weight">
            Weight
          </label>
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.01"
            defaultValue={fieldValue(product?.weight)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="homepageOrder">
            Homepage order
          </label>
          <input
            id="homepageOrder"
            name="homepageOrder"
            type="number"
            defaultValue={fieldValue(product?.homepageOrder)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} />
          Featured
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input name="newArrival" type="checkbox" defaultChecked={product?.newArrival ?? false} />
          New arrival
        </label>
      </section>

      <section className="border border-black/10 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Product images</h2>
          <p className="mt-1 text-sm text-black/55">
            Upload up to 15 photos at once (hold Ctrl/Cmd to multi-select). First image is the cover —
            use Make cover or arrows to change order.
            Photos are compressed before upload for speed.
          </p>
        </div>
        <ProductImageGallery items={gallery} onChange={setGallery} max={IMAGE_SLOTS} />
        {gallery.map((item, index) => (
          <input key={`hidden-${item.key}`} type="hidden" name={`existingImageUrl${index}`} value={item.url} readOnly />
        ))}
      </section>

      <div className="space-y-3">
        {progress ? (
          <div className="border border-black/10 bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{progress.label}</span>
              <span className="font-medium">{progress.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden bg-neutral-100">
              <div className="h-full bg-black transition-all duration-200" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="min-w-[180px] bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-80"
          >
            {busy
              ? progress
                ? `${progress.pct}% · ${progress.label}`
                : 'Saving…'
              : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
