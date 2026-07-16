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
  isVisible?: boolean;
};

type ProductForForm = {
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  brandLogoUrl?: string | null;
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
const CLOTHES_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL'] as const;
const SHOE_EU = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const;
const SHOE_UK = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
const SHOE_US = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13'] as const;

type SizeMode = 'clothes' | 'shoes' | 'custom' | 'none';

function fieldValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function guessSizeMode(sizes: string[]): SizeMode {
  if (!sizes.length) return 'none';

  const joined = sizes.join(' ').toUpperCase();
  if (joined.includes('EU ') || joined.includes('UK ') || joined.includes('US ')) {
    return 'shoes';
  }

  const normalized = sizes.map((size) => size.trim().toUpperCase());
  const clothesSet = new Set<string>(CLOTHES_SIZES);
  if (normalized.every((size) => clothesSet.has(size))) {
    return 'clothes';
  }

  return 'custom';
}

function parseSelectedSizes(sizes: string[], mode: SizeMode) {
  if (mode === 'none') return [];
  if (mode === 'custom') return sizes.map((size) => size.trim()).filter(Boolean);
  if (mode === 'clothes') {
    const clothesSet = new Set<string>(CLOTHES_SIZES);
    return sizes
      .map((size) => size.trim().toUpperCase())
      .filter((size) => clothesSet.has(size));
  }

  const selected = new Set(sizes.map((size) => size.trim().toUpperCase()));
  return {
    eu: SHOE_EU.filter((size) => selected.has(`EU ${size}`) || selected.has(size)).map((size) => `EU ${size}`),
    uk: SHOE_UK.filter((size) => selected.has(`UK ${size}`)).map((size) => `UK ${size}`),
    us: SHOE_US.filter((size) => selected.has(`US ${size}`)).map((size) => `US ${size}`),
  };
}

function parseCustomSizes(value: string) {
  return value
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean);
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
  const [sizeMode, setSizeMode] = useState<SizeMode>(initialMode);
  const initialParsed = parseSelectedSizes(product?.sizes ?? [], initialMode);
  const [clothesSizes, setClothesSizes] = useState<string[]>(
    Array.isArray(initialParsed) && initialMode === 'clothes' ? initialParsed : [],
  );
  const [shoeEu, setShoeEu] = useState<string[]>(
    !Array.isArray(initialParsed) ? initialParsed.eu : [],
  );
  const [shoeUk, setShoeUk] = useState<string[]>(
    !Array.isArray(initialParsed) ? initialParsed.uk : [],
  );
  const [shoeUs, setShoeUs] = useState<string[]>(
    !Array.isArray(initialParsed) ? initialParsed.us : [],
  );
  const [customSizesText, setCustomSizesText] = useState(
    initialMode === 'custom' ? (product?.sizes ?? []).join(', ') : '',
  );

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
    sizeMode === 'none'
      ? []
      : sizeMode === 'custom'
        ? parseCustomSizes(customSizesText)
        : sizeMode === 'clothes'
          ? clothesSizes
          : [...shoeEu, ...shoeUk, ...shoeUs];

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
        // Gallery already crushed on pick — upload in parallel
        let completed = 0;
        setProgress({ pct: 10, label: `Uploading ${pendingUploads.length} image(s)…` });
        await mapPool(
          pendingUploads,
          6,
          async ({ item, index }) => {
            const url = await uploadFile(item.file as File, () => {
              const pct = 10 + Math.round(((completed + 0.5) / pendingUploads.length) * 75);
              setProgress({
                pct: Math.min(88, pct),
                label: `Uploading images… ${completed + 1}/${pendingUploads.length}`,
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

        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="brand">
            Brand / vendor
          </label>
          <input
            id="brand"
            name="brand"
            defaultValue={product?.brand ?? 'rep.markets'}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="brandLogo">
            Brand logo
          </label>
          <p className="mt-1 text-xs text-black/55">
            Small square logo shown under each product on the shop. PNG or JPG, ideally 128×128 px.
          </p>
          {product?.brandLogoUrl ? (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.brandLogoUrl}
                alt="Current brand logo"
                className="size-12 rounded-full border border-black/10 bg-white object-contain p-1"
              />
              <input type="hidden" name="existingBrandLogoUrl" value={product.brandLogoUrl} />
            </div>
          ) : null}
          <input
            id="brandLogo"
            name="brandLogo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-3 block w-full text-sm text-black/70 file:mr-3 file:border file:border-black file:bg-black file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-white"
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
                {category.isVisible === false ? " (hidden on shop)" : ""}
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
            defaultValue={product?.stock ?? 1000}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div className="md:col-span-3">
          <p className="text-sm font-medium">Sizes</p>
          <input type="hidden" name="sizes" value={selectedSizes.join(', ')} readOnly />
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'clothes', label: 'CLOTHES' },
                { id: 'shoes', label: 'SHOES' },
                { id: 'custom', label: 'CUSTOM' },
                { id: 'none', label: 'NO SIZE' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSizeMode(mode.id)}
                className={cn(
                  'border px-4 py-2 text-xs font-semibold tracking-[0.14em]',
                  sizeMode === mode.id ? 'border-black bg-black text-white' : 'border-black/15',
                )}
              >
                {mode.label}
              </button>
            ))}
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
          ) : null}

          {sizeMode === 'shoes' ? (
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
          ) : null}

          {sizeMode === 'custom' ? (
            <div className="mt-4">
              <label className="block text-sm text-black/60" htmlFor="customSizes">
                Type sizes separated by commas (e.g. S/M, L/XL, 7 1/8, ONE SIZE)
              </label>
              <textarea
                id="customSizes"
                value={customSizesText}
                onChange={(event) => setCustomSizesText(event.target.value)}
                rows={3}
                placeholder="S/M, L/XL, ONE SIZE"
                className="mt-2 w-full border border-black/15 px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>
          ) : null}

          {sizeMode === 'none' ? (
            <p className="mt-4 text-sm text-black/55">
              No size options will be shown on the product page (good for accessories with no sizing).
            </p>
          ) : null}

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
          <label className="flex items-center gap-2 text-sm">
            <input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} />
            Featured (managed as one of 6 homepage slots — open Products to reorder)
          </label>
        </div>

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
            Photos are optimized as you pick them (~1000px JPEG), then uploaded in parallel.
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
