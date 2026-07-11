import { slugify } from '@/lib/utils';

/** Nav: ALL + REP (parent) + leaf product categories */
export const CATEGORIES = [
  'ALL',
  'REP',
  'T-SHIRTS',
  'SHOES',
  'CHAINS',
  'BOTTOM',
  'ACCESSORIES',
  'HEADWEAR',
] as const;

export type ProductCategory = (typeof CATEGORIES)[number];
export type LeafCategory = Exclude<ProductCategory, 'ALL' | 'REP'>;

/** Leaf categories that live under REP */
export const REP_CHILDREN: LeafCategory[] = [
  'T-SHIRTS',
  'SHOES',
  'CHAINS',
  'BOTTOM',
  'ACCESSORIES',
  'HEADWEAR',
];

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
    const raw = source[option.id];
    if (raw === null || raw === undefined || raw === '') continue;
    const parsed = Number(raw);
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

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  qualityPrices?: QualityPriceMap;
  category: LeafCategory;
  description: string;
  material: string;
  sizes: string[];
  colors: string[];
  tags: string[];
  /** Ordered gallery (cover = first image) */
  images: string[];
  featured?: boolean;
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
  material?: string | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  tags?: string[] | null;
  featured?: boolean | null;
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

function toCategory(input?: string | null): LeafCategory {
  const normalized = (input || '').toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (normalized.includes('SHOE')) return 'SHOES';
  if (normalized.includes('CHAIN') || normalized.includes('JEWEL')) return 'CHAINS';
  if (normalized.includes('BOTTOM') || normalized.includes('PANT') || normalized.includes('DENIM')) {
    return 'BOTTOM';
  }
  if (normalized.includes('ACCESS') || normalized.includes('BAG') || normalized.includes('TOTE')) {
    return 'ACCESSORIES';
  }
  if (normalized.includes('HEAD') || normalized.includes('CAP') || normalized.includes('HAT')) {
    return 'HEADWEAR';
  }
  if (
    normalized.includes('TOP') ||
    normalized.includes('SHIRT') ||
    normalized.includes('TANK') ||
    normalized.includes('TEE')
  ) {
    return 'T-SHIRTS';
  }
  return 'T-SHIRTS';
}

export function mapPrismaProductToStore(product: PrismaProductShape): StoreProduct {
  const media = [...(product.media ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const gallery = media.map((image) => image.url).filter(Boolean) as string[];
  const fallback = mockImage(product.name, 'f7f7f2');

  return {
    id: product.id,
    slug: product.slug || slugify(product.name),
    name: product.name,
    price: toNumber(product.price),
    salePrice: product.salePrice ? toNumber(product.salePrice) : null,
    qualityPrices: parseQualityPrices(product.qualityPrices),
    category: toCategory(product.category?.slug || product.category?.name || product.tags?.[0]),
    description:
      product.longDescription ||
      product.shortDescription ||
      'A restrained daily piece from rep.markets, designed for repeated wear and quiet utility.',
    material: product.material || 'Cotton blend',
    sizes: product.sizes?.length ? product.sizes : ['XS', 'S', 'M', 'L', 'XL'],
    colors: product.colors?.length ? product.colors : ['Black', 'Natural'],
    tags: product.tags ?? [],
    images: gallery.length ? gallery : [fallback],
    featured: Boolean(product.featured),
    newArrival: Boolean(product.newArrival),
  };
}

export const mockProducts: StoreProduct[] = [
  {
    id: 'pt-001',
    slug: 'studio-poplin-shirt',
    name: 'Studio Poplin Shirt',
    price: 128,
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

export function filterProducts(products: StoreProduct[], category = 'ALL') {
  const selected = category.toUpperCase();

  const filtered =
    selected === 'ALL' || selected === 'REP'
      ? products
      : products.filter((product) => product.category === selected);

  return filtered.map((product) => ({
    ...product,
    image: product.images[0],
  }));
}

export function getProductBySlug(slug: string) {
  return mockProducts.find((product) => product.slug === slug);
}
