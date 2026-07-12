import { unstable_cache } from 'next/cache';
import { ProductStatus } from '@/generated/prisma';
import { mapPrismaProductToStore, type StoreNavCategory, type StoreProduct, type CatalogLine } from '@/lib/products';
import { prisma } from '@/lib/prisma';

export const CATALOG_CACHE_TAG = 'catalog';

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  qualityPrices?: unknown;
  shortDescription: string | null;
  longDescription?: string | null;
  material?: string | null;
  sizes?: unknown;
  colors?: unknown;
  tags?: unknown;
  featured: boolean;
  homepageOrder: number | null;
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
  shortDescription: true,
  tags: true,
  featured: true,
  homepageOrder: true,
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
  qualityPrices: true,
  material: true,
  sizes: true,
  colors: true,
  longDescription: true,
  media: detailMediaSelect,
} as const;

async function loadActiveProducts(): Promise<StoreProduct[]> {
  const products = (await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: listSelect,
    orderBy: [{ featured: 'desc' }, { homepageOrder: 'asc' }, { createdAt: 'desc' }],
  } as never)) as unknown as CatalogRow[];

  const mapped = products.map(normalizeProduct);
  const featuredSorted = mapped
    .filter((product) => product.featured)
    .sort((a, b) => {
      const aOrder = a.homepageOrder ?? 999;
      const bOrder = b.homepageOrder ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 6);

  const rankById = new Map(featuredSorted.map((product, index) => [product.id, index + 1]));

  return mapped
    .map((product) => {
      const rank = rankById.get(product.id);
      if (rank == null) {
        return { ...product, featured: false, homepageOrder: null };
      }
      return { ...product, featured: true, homepageOrder: rank };
    })
    .sort((a, b) => {
      if (a.featured && b.featured) {
        return (a.homepageOrder ?? 999) - (b.homepageOrder ?? 999);
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return 0;
    });
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
    { revalidate: 30, tags: [CATALOG_CACHE_TAG] },
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

function parentToLine(parent?: { name: string; slug: string } | null): CatalogLine {
  const bits = `${parent?.slug || ''} ${parent?.name || ''}`.toUpperCase();
  if (bits.includes('NON')) return 'NON_REP';
  return 'REP';
}

/** Visible leaf categories for homepage pills (respects admin isVisible). */
export async function getStorefrontNavCategories(): Promise<StoreNavCategory[]> {
  return unstable_cache(
    async () => {
      const categories = await prisma.category.findMany({
        where: {
          isVisible: true,
          parentId: { not: null },
        },
        select: {
          name: true,
          slug: true,
          sortOrder: true,
          parent: { select: { name: true, slug: true, isVisible: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return categories
        .filter((category) => {
          // Skip orphans under hidden/unknown parents that aren't shop lines
          const parentName = `${category.parent?.slug || ''} ${category.parent?.name || ''}`.toUpperCase();
          return parentName.includes('REP') || parentName.includes('NON');
        })
        .map((category) => ({
          slug: category.slug,
          label: category.name.replace(/[_-]+/g, ' ').trim().toUpperCase(),
          line: parentToLine(category.parent),
        }));
    },
    ['storefront-nav-categories'],
    { revalidate: 30, tags: [CATALOG_CACHE_TAG] },
  )();
}
