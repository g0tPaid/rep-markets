'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import type { ProductActionState } from '@/app/admin/actions/products';
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
const IMAGE_SLOTS = 8;
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

function ImageUploadField({
  id,
  label,
  existingUrl,
  existingName,
  existingValue,
  onExistingChange,
  file,
  onFileChange,
}: {
  id: string;
  label: string;
  existingUrl: string;
  existingName: string;
  existingValue: string;
  onExistingChange: (url: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState(existingValue || existingUrl);

  useEffect(() => {
    setPreviewUrl(existingValue || existingUrl);
  }, [existingUrl, existingValue]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) {
      onFileChange(null);
      setPreviewUrl(existingValue || existingUrl);
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      onFileChange(null);
      event.target.value = '';
      alert('Image must be 8MB or smaller.');
      return;
    }
    onFileChange(next);
    const blobUrl = URL.createObjectURL(next);
    setPreviewUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return blobUrl;
    });
  }

  return (
    <div>
      <p className="block text-sm font-medium">{label}</p>
      <input type="hidden" name={existingName} value={existingValue} onChange={(e) => onExistingChange(e.target.value)} />
      <div className="mt-2 overflow-hidden border border-black/15 bg-neutral-50">
        <div className="relative aspect-[4/5] bg-neutral-100">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-black/40">No image yet</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 p-3">
          <label htmlFor={id} className="cursor-pointer bg-black px-3 py-1.5 text-xs font-medium text-white">
            Upload
          </label>
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="sr-only" />
          <span className="text-xs text-black/55">
            {file?.name || (existingValue ? 'Ready' : 'JPG/PNG/WEBP · max 8MB')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductForm({ action, categories, product, submitLabel }: ProductFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState('');
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);

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
  const [existingUrls, setExistingUrls] = useState<string[]>(
    Array.from({ length: IMAGE_SLOTS }, (_, index) => sortedMedia[index]?.url ?? ''),
  );
  const [files, setFiles] = useState<Array<File | null>>(Array.from({ length: IMAGE_SLOTS }, () => null));

  const selectedSizes =
    sizeMode === 'clothes' ? clothesSizes : [...shoeEu, ...shoeUk, ...shoeUs];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('sizes', selectedSizes.join(', '));

    const uploads = files
      .map((file, index) => (file ? { file, index } : null))
      .filter(Boolean) as Array<{ file: File; index: number }>;

    try {
      for (let i = 0; i < uploads.length; i += 1) {
        const { file, index } = uploads[i];
        const base = Math.round((i / Math.max(uploads.length, 1)) * 85);
        setProgress({
          pct: base,
          label: `Uploading image ${i + 1} of ${uploads.length}…`,
        });

        const url = await uploadFile(file, (filePct) => {
          const overall = base + Math.round((filePct / 100) * (85 / Math.max(uploads.length, 1)));
          setProgress({
            pct: Math.min(85, overall),
            label: `Uploading image ${i + 1} of ${uploads.length}… ${filePct}%`,
          });
        });

        formData.set(`existingImageUrl${index}`, url);
        setExistingUrls((current) => {
          const next = [...current];
          next[index] = url;
          return next;
        });
      }

      for (let index = 0; index < IMAGE_SLOTS; index += 1) {
        formData.delete(`image${index}`);
        if (!formData.get(`existingImageUrl${index}`)) {
          formData.set(`existingImageUrl${index}`, existingUrls[index] || '');
        }
      }

      setProgress({ pct: 92, label: 'Saving product…' });
      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      setProgress(null);
      setClientError(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  useEffect(() => {
    if (state.error) setProgress(null);
  }, [state.error]);

  useEffect(() => {
    if (!pending && progress && !state.error) {
      // Keep bar visible briefly while redirect happens
      setProgress({ pct: 100, label: 'Done' });
    }
  }, [pending, progress, state.error]);

  const error = clientError || state.error;
  const busy = pending || Boolean(progress && progress.pct < 100);

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
            Upload up to 8 photos (JPG/PNG/WEBP, max 8MB each). Images upload first with a progress bar,
            then the product is saved.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: IMAGE_SLOTS }, (_, index) => (
            <ImageUploadField
              key={index}
              id={`image${index}`}
              label={`Image ${index + 1}${index === 0 ? ' (cover)' : ''}`}
              existingUrl={sortedMedia[index]?.url ?? ''}
              existingName={`existingImageUrl${index}`}
              existingValue={existingUrls[index] ?? ''}
              onExistingChange={(url) =>
                setExistingUrls((current) => {
                  const next = [...current];
                  next[index] = url;
                  return next;
                })
              }
              file={files[index]}
              onFileChange={(file) =>
                setFiles((current) => {
                  const next = [...current];
                  next[index] = file;
                  return next;
                })
              }
            />
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Working…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
