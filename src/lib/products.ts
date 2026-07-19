import { formatPrice, slugify } from '@/lib/utils';

/** Fallback pills only — live homepage uses DB-visible categories. */
export const CATEGORIES = [
  'ALL',
  'T-SHIRTS',
  'SHOES',
  'SHORTS',
  'ACCESSORIES',
  'CAPS',
] as const;

export const VIEWS = ['REPS', 'NON_REP'] as const;

export type ProductView = (typeof VIEWS)[number];
/** Selected nav key: ALL or a category slug from admin */
export type ProductCategory = string;
export type CatalogLine = 'REP' | 'NON_REP';

export type StoreNavCategory = {
  slug: string;
  label: string;
  line: CatalogLine;
};

export const VIEW_LABELS: Record<ProductView, string> = {
  REPS: 'REPS',
  NON_REP: 'NON-REP',
};

export const QUALITY_OPTIONS = [
  { id: 'NORMAL', label: 'Normal quality', multiplier: 1 },
  { id: 'GOOD', label: 'Good quality', multiplier: 1.25 },
  { id: 'HIGH', label: 'High quality', multiplier: 1.55 },
  { id: 'ONE_TO_ONE', label: '1:1', multiplier: 1.9 },
  { id: 'MIRROR', label: 'Mirror', multiplier: 2.25 },
] as const;

export type QualityOptionId = (typeof QUALITY_OPTIONS)[number]['id'];

export type QualityPriceMap = Partial<Record<QualityOptionId, number | null>>;

export function getQualityOption(id: QualityOptionId | string | undefined) {
  return QUALITY_OPTIONS.find((option) => option.id === id) ?? QUALITY_OPTIONS[0];
}

export function parseQualityPrices(value: unknown): QualityPriceMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const prices: QualityPriceMap = {};

  for (const option of QUALITY_OPTIONS) {
    const raw = source[option.id] ?? source[option.id.toLowerCase()];
    if (raw === null || raw === undefined || raw === '') continue;
    const parsed = Number(typeof raw === 'object' && raw !== null && 'toString' in raw ? String(raw) : raw);
    if (Number.isFinite(parsed)) {
      prices[option.id] = parsed;
    }
  }

  return prices;
}

export function priceForQuality(
  basePrice: number,
  qualityId: QualityOptionId | string | undefined,
  qualityPrices?: QualityPriceMap | null,
) {
  const quality = getQualityOption(qualityId);
  const custom = qualityPrices?.[quality.id];
  if (typeof custom === 'number' && Number.isFinite(custom)) {
    return Math.round(custom * 100) / 100;
  }
  return Math.round(basePrice * quality.multiplier * 100) / 100;
}

/** Storefront grid / search price — always Normal quality (sale override first). */
export function normalDisplayPrice(product: {
  price: number;
  salePrice?: number | null;
  qualityPrices?: QualityPriceMap | null;
}) {
  const base = product.salePrice ?? product.price;
  return priceForQuality(base, 'NORMAL', product.qualityPrices);
}

/** Lowest (Normal) → highest quality tier price for storefront range display. */
export function qualityPriceRange(product: {
  price: number;
  salePrice?: number | null;
  qualityPrices?: QualityPriceMap | null;
}) {
  const base = product.salePrice ?? product.price;
  const prices = QUALITY_OPTIONS.map((option) =>
    priceForQuality(base, option.id, product.qualityPrices),
  );
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return { low, high };
}

export function formatQualityPriceRange(product: {
  price: number;
  salePrice?: number | null;
  qualityPrices?: QualityPriceMap | null;
}) {
  const { low, high } = qualityPriceRange(product);
  if (Math.abs(high - low) < 0.01) return formatPrice(low);
  return `${formatPrice(low)} – ${formatPrice(high)}`;
}

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  qualityPrices?: QualityPriceMap;
  /** REP or NON-REP catalog line (from parent category in admin) */
  line: CatalogLine;
  /** Display label from admin category name */
  category: string;
  /** Admin category slug — used for homepage filter pills */
  categorySlug?: string;
  brand?: string | null;
  brandLogoUrl?: string | null;
  description: string;
  material: string;
  sizes: string[];
  colors: string[];
  tags: string[];
  /** Ordered gallery (cover = first image) */
  images: string[];
  featured?: boolean;
  /** Featured slot 1–6 within this product's catalog line (REP / NON-REP) */
  homepageOrder?: number | null;
  newArrival?: boolean;
};

type DecimalLike = number | string | { toString: () => string } | null | undefined;

type PrismaMediaShape = {
  url?: string | null;
  kind?: string | null;
  alt?: string | null;
  sortOrder?: number | null;
};

type PrismaCategoryShape = {
  name?: string | null;
  slug?: string | null;
  parent?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

export type PrismaProductShape = {
  id: string;
  slug?: string | null;
  name: string;
  price: DecimalLike;
  salePrice?: DecimalLike;
  qualityPrices?: unknown;
  shortDescription?: string | null;
  longDescription?: string | null;
  brand?: string | null;
  brandLogoUrl?: string | null;
  material?: string | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  tags?: string[] | null;
  featured?: boolean | null;
  homepageOrder?: number | null;
  newArrival?: boolean | null;
  category?: PrismaCategoryShape | null;
  media?: PrismaMediaShape[] | null;
};

const ITEM_PHOTOS = [
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1590874103328-eac38a674cb2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1588850561407-ed78c456a51d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
];

function mockImage(label: string, bg = 'f5f5f0') {
  return `https://placehold.co/900x1200/${bg}/111111?text=${encodeURIComponent(label)}`;
}

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(typeof value === 'object' ? value.toString() : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Max featured homepage slots per catalog line (REP and NON-REP each). */
export const MAX_FEATURED_PER_LINE = 6;

export function catalogLineFromCategory(category?: PrismaCategoryShape | null): CatalogLine {
  const bits = [
    category?.slug,
    category?.name,
    category?.parent?.slug,
    category?.parent?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  if (bits.includes('NON')) return 'NON_REP';
  return 'REP';
}

function toCatalogLine(category?: PrismaCategoryShape | null): CatalogLine {
  return catalogLineFromCategory(category);
}

function toCategoryLabel(category?: PrismaCategoryShape | null, fallbackTag?: string | null) {
  const raw = category?.name || category?.slug || fallbackTag || 'UNASSIGNED';
  return raw.replace(/[_-]+/g, ' ').trim().toUpperCase() || 'UNASSIGNED';
}

function toCategorySlug(category?: PrismaCategoryShape | null, label?: string) {
  if (category?.slug) return category.slug.toLowerCase();
  return slugify(label || 'unassigned');
}

export function mapPrismaProductToStore(product: PrismaProductShape): StoreProduct {
  const media = [...(product.media ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const gallery = media.map((image) => image.url).filter(Boolean) as string[];
  const fallback = mockImage(product.name, 'f7f7f2');
  const categoryLabel = toCategoryLabel(product.category, product.tags?.[0]);

  return {
    id: product.id,
    slug: product.slug || slugify(product.name),
    name: product.name,
    price: toNumber(product.price),
    salePrice: product.salePrice ? toNumber(product.salePrice) : null,
    qualityPrices: parseQualityPrices(product.qualityPrices),
    line: toCatalogLine(product.category),
    category: categoryLabel,
    categorySlug: toCategorySlug(product.category, categoryLabel),
    brand: product.brand?.trim() || null,
    brandLogoUrl: product.brandLogoUrl?.trim() || null,
    description: (() => {
      const raw = (product.longDescription || product.shortDescription || '').trim();
      if (!raw) return '';
      if (/restrained daily piece from rep\.markets/i.test(raw)) return '';
      return raw;
    })(),
    material: (() => {
      const raw = product.material?.trim() || '';
      if (!raw) return '';
      if (/^cotton blend$/i.test(raw)) return '';
      return raw;
    })(),
    sizes: Array.isArray(product.sizes) ? (product.sizes as string[]) : [],
    colors: product.colors?.length ? product.colors : ['Black', 'Natural'],
    tags: product.tags ?? [],
    images: gallery.length ? gallery : [fallback],
    featured: Boolean(product.featured),
    homepageOrder:
      typeof product.homepageOrder === 'number' && Number.isFinite(product.homepageOrder)
        ? product.homepageOrder
        : null,
    newArrival: Boolean(product.newArrival),
  };
}

export const mockProducts: StoreProduct[] = [
  {
    id: 'pt-001',
    slug: 'studio-poplin-shirt',
    name: 'Studio Poplin Shirt',
    price: 128,
    line: 'REP' as const,
    category: 'T-SHIRTS',
    description: 'A crisp oversized shirt with a softened collar, cut for polished everyday layering.',
    material: 'Organic cotton poplin',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['White', 'Graphite'],
    tags: ['shirt', 'daily'],
    images: [ITEM_PHOTOS[0]],
    featured: true,
    newArrival: true,
  },
  {
    id: 'pt-002',
    slug: 'column-wool-trouser',
    name: 'Column Wool Trouser',
    price: 186,
    line: 'REP' as const,
    category: 'BOTTOM',
    description: 'Straight-leg trousers with a long crease, designed to sit cleanly over low shoes.',
    material: 'Lightweight wool twill',
    sizes: ['24', '26', '28', '30', '32'],
    colors: ['Black', 'Charcoal'],
    tags: ['tailoring'],
    images: [ITEM_PHOTOS[1]],
  },
  {
    id: 'pt-003',
    slug: 'utility-tank',
    name: 'Utility Tank',
    price: 64,
    line: 'REP' as const,
    category: 'T-SHIRTS',
    description: 'A ribbed tank with a high neckline and compact shoulder line.',
    material: 'Ribbed cotton jersey',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Black', 'Bone'],
    tags: ['base layer'],
    images: [ITEM_PHOTOS[2]],
  },
  {
    id: 'pt-004',
    slug: 'flat-chain-bracelet',
    name: 'Flat Chain Bracelet',
    price: 92,
    line: 'REP' as const,
    category: 'CHAINS',
    description: 'A low-profile chain bracelet with a polished finish and concealed clasp.',
    material: 'Stainless steel',
    sizes: ['ONE SIZE'],
    colors: ['Silver'],
    tags: ['jewelry'],
    images: [ITEM_PHOTOS[3]],
    featured: true,
  },
  {
    id: 'pt-005',
    slug: 'market-canvas-tote',
    name: 'Market Canvas Tote',
    price: 78,
    line: 'REP' as const,
    category: 'ACCESSORIES',
    description: 'A structured tote with reinforced handles and a quiet interior pocket.',
    material: 'Heavy cotton canvas',
    sizes: ['ONE SIZE'],
    colors: ['Natural', 'Black'],
    tags: ['bag'],
    images: [ITEM_PHOTOS[4]],
  },
  {
    id: 'pt-006',
    slug: 'canvas-field-cap',
    name: 'Canvas Field Cap',
    price: 58,
    line: 'REP' as const,
    category: 'HEADWEAR',
    description: 'A soft field cap with a short brim and unlined crown.',
    material: 'Washed cotton canvas',
    sizes: ['S/M', 'L/XL'],
    colors: ['Olive', 'Black'],
    tags: ['cap'],
    images: [ITEM_PHOTOS[5]],
  },
  {
    id: 'pt-007',
    slug: 'paperweight-hoop-earrings',
    name: 'Paperweight Hoop Earrings',
    price: 86,
    line: 'REP' as const,
    category: 'CHAINS',
    description: 'Thick polished hoops with a solid feel and a hinged closure.',
    material: 'Brass with silver finish',
    sizes: ['ONE SIZE'],
    colors: ['Silver'],
    tags: ['earrings'],
    images: [ITEM_PHOTOS[6]],
  },
  {
    id: 'pt-008',
    slug: 'soft-pleat-short',
    name: 'Soft Pleat Short',
    price: 112,
    line: 'REP' as const,
    category: 'BOTTOM',
    description: 'Knee-length shorts with a soft front pleat and clean side seam.',
    material: 'Tropical wool',
    sizes: ['24', '26', '28', '30', '32'],
    colors: ['Black', 'Stone'],
    tags: ['shorts'],
    images: [ITEM_PHOTOS[7]],
  },
  {
    id: 'pt-009',
    slug: 'workroom-cardigan',
    name: 'Workroom Cardigan',
    price: 154,
    line: 'REP' as const,
    category: 'T-SHIRTS',
    description: 'A fine-gauge cardigan with a deep V and slightly extended sleeves.',
    material: 'Merino wool',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Oatmeal'],
    tags: ['knit'],
    images: [ITEM_PHOTOS[8]],
    newArrival: true,
  },
  {
    id: 'pt-010',
    slug: 'court-runner',
    name: 'Court Runner',
    price: 140,
    line: 'REP' as const,
    category: 'SHOES',
    description: 'A clean low runner with a quiet sole and everyday upper.',
    material: 'Leather and mesh',
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['White', 'Black'],
    tags: ['shoes'],
    images: [ITEM_PHOTOS[1]],
    featured: true,
  },
];

export function filterProducts(
  products: StoreProduct[],
  category = 'ALL',
  view: ProductView = 'REPS',
) {
  const selected = category.trim();
  const selectedKey = selected.toLowerCase();
  const line: CatalogLine = view === 'NON_REP' ? 'NON_REP' : 'REP';

  const byLine = products.filter((product) => product.line === line);

  const filtered =
    !selected || selected.toUpperCase() === 'ALL'
      ? byLine
      : byLine.filter((product) => {
          const slug = (product.categorySlug || '').toLowerCase();
          const label = (product.category || '').toLowerCase();
          return (
            slug === selectedKey ||
            label === selectedKey ||
            slugify(product.category) === selectedKey
          );
        });

  return filtered.map((product) => ({
    ...product,
    image: product.images[0],
  }));
}

export function getProductBySlug(slug: string) {
  return mockProducts.find((product) => product.slug === slug);
}
