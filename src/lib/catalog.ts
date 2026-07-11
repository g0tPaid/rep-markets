import { ProductStatus } from '@/generated/prisma';
import { mapPrismaProductToStore, type StoreProduct } from '@/lib/products';
import { prisma } from '@/lib/prisma';

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  qualityPrices: unknown;
  shortDescription: string | null;
  longDescription: string | null;
  material: string | null;
  sizes: unknown;
  colors: unknown;
  tags: unknown;
  featured: boolean;
  newArrival: boolean;
  category: {
    name: string;
    slug: string;
    parent: { name: string; slug: string } | null;
  } | null;
  media: Array<{
    url: string;
    kind: string;
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

async function queryActiveProducts(where: Record<string, unknown> = {}) {
  return prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE, ...where },
    include: {
      category: { include: { parent: true } },
      media: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ homepageOrder: 'asc' }, { createdAt: 'desc' }],
    // Local Prisma client can lag schema; cast keeps storefront builds unblocked.
  } as never) as unknown as CatalogRow[];
}

export async function getActiveProducts(): Promise<StoreProduct[]> {
  const products = await queryActiveProducts();
  return products.map(normalizeProduct);
}

export async function getActiveProductBySlug(slug: string): Promise<StoreProduct | null> {
  const products = await queryActiveProducts({ slug });
  const product = products[0];
  return product ? normalizeProduct(product) : null;
}

export async function getActiveProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  if (!ids.length) return [];

  const products = await queryActiveProducts({ id: { in: ids } });
  const mapped = products.map(normalizeProduct);

  return ids
    .map((id) => mapped.find((product) => product.id === id))
    .filter((product): product is StoreProduct => Boolean(product));
}
