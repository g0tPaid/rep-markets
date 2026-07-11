import { unstable_cache } from 'next/cache';
import { ProductStatus } from '@/generated/prisma';
import { mapPrismaProductToStore, type StoreProduct } from '@/lib/products';
import { prisma } from '@/lib/prisma';

export const CATALOG_CACHE_TAG = 'catalog';

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  qualityPrices: unknown;
  shortDescription: string | null;
  longDescription?: string | null;
  material: string | null;
  sizes: unknown;
  colors: unknown;
  tags: unknown;
  featured: boolean;
  newArrival: boolean;
  categoryId?: string | null;
  category: {
    name: string;
    slug: string;
    parent: { name: string; slug: string } | null;
  } | null;
  media: Array<{
    url: string;
    kind?: string | null;
    alt: string | null;
    sortOrder: number;
  }>;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeProduct(product: CatalogRow): StoreProduct {
  return mapPrismaProductToStore({
    ...product,
    sizes: asStringArray(product.sizes),
    colors: asStringArray(product.colors),
    tags: asStringArray(product.tags),
  });
}

const categorySelect = {
  select: {
    name: true,
    slug: true,
    parent: { select: { name: true, slug: true } },
  },
} as const;

/** Cover image only — enough for grids and search. */
const listMediaSelect = {
  orderBy: { sortOrder: 'asc' as const },
  take: 1,
  select: { url: true, alt: true, sortOrder: true },
};

const listSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  salePrice: true,
  qualityPrices: true,
  shortDescription: true,
  material: true,
  sizes: true,
  colors: true,
  tags: true,
  featured: true,
  newArrival: true,
  categoryId: true,
  category: categorySelect,
  media: listMediaSelect,
} as const;

const detailMediaSelect = {
  orderBy: { sortOrder: 'asc' as const },
  select: { url: true, kind: true, alt: true, sortOrder: true },
};

const detailSelect = {
  ...listSelect,
  longDescription: true,
  media: detailMediaSelect,
} as const;

async function loadActiveProducts(): Promise<StoreProduct[]> {
  const products = (await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: listSelect,
    orderBy: [{ homepageOrder: 'asc' }, { createdAt: 'desc' }],
  } as never)) as unknown as CatalogRow[];

  return products.map(normalizeProduct);
}

/** Cached at runtime only — pages stay dynamic so Docker builds need no DATABASE_URL. */
export function getActiveProducts(): Promise<StoreProduct[]> {
  return unstable_cache(loadActiveProducts, ['active-products'], {
    revalidate: 60,
    tags: [CATALOG_CACHE_TAG],
  })();
}

export async function getActiveProductBySlug(slug: string): Promise<StoreProduct | null> {
  const product = (await prisma.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE },
    select: detailSelect,
  } as never)) as unknown as CatalogRow | null;

  return product ? normalizeProduct(product) : null;
}

export async function getProductPageData(slug: string): Promise<{
  product: StoreProduct;
  related: StoreProduct[];
} | null> {
  return unstable_cache(
    async () => {
      const product = (await prisma.product.findFirst({
        where: { slug, status: ProductStatus.ACTIVE },
        select: detailSelect,
      } as never)) as unknown as CatalogRow | null;

      if (!product) return null;

      const relatedRows = (await prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          id: { not: product.id },
          ...(product.categoryId ? { categoryId: product.categoryId } : {}),
        },
        select: listSelect,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 3,
      } as never)) as unknown as CatalogRow[];

      return {
        product: normalizeProduct(product),
        related: relatedRows.map(normalizeProduct),
      };
    },
    ['product-page', slug],
    { revalidate: 60, tags: [CATALOG_CACHE_TAG] },
  )();
}

export async function getRelatedProducts(
  product: StoreProduct,
  categoryId: string | null | undefined,
  limit = 3,
): Promise<StoreProduct[]> {
  const products = (await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      id: { not: product.id },
      ...(categoryId ? { categoryId } : {}),
    },
    select: listSelect,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  } as never)) as unknown as CatalogRow[];

  return products.map(normalizeProduct);
}

export async function getActiveProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  if (!ids.length) return [];

  const products = (await prisma.product.findMany({
    where: { id: { in: ids }, status: ProductStatus.ACTIVE },
    select: listSelect,
  } as never)) as unknown as CatalogRow[];

  const mapped = products.map(normalizeProduct);
  return ids
    .map((id) => mapped.find((item) => item.id === id))
    .filter((item): item is StoreProduct => Boolean(item));
}
