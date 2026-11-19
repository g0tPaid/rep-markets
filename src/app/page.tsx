import { HomeCatalog } from '@/components/store/home-catalog';
import { getActiveProducts } from '@/lib/catalog';
import { filterProducts, VIEWS, type ProductView, type StoreProduct } from '@/lib/products';
import { GTA_CATEGORIES, gtaCategorySlug } from '@/lib/gta-import';

/** Dynamic so builds do not need DATABASE_URL; catalog is cached at runtime. */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await getActiveProducts();
  const initial = {} as Record<ProductView, StoreProduct[]>;
  const totals = {} as Record<ProductView, number>;
  const categories = new Map<string, string>();
  for (const view of VIEWS) {
    const filtered = filterProducts(products, 'ALL', view);
    initial[view] = filtered.slice(0, 12);
    totals[view] = filtered.length;
    if (view === 'GTA_6') for (const product of filtered) {
      const key = product.categorySlug || product.category;
      if (key) categories.set(key, key === 'gta-6' ? 'General GTA Merch' : GTA_CATEGORIES.find((item) => gtaCategorySlug(item) === key) || product.category);
    }
  }
  return <HomeCatalog initial={initial} totals={totals} gtaCategories={[...categories.entries()].sort((a, b) => a[1].localeCompare(b[1]))} />;
}

