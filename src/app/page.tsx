import { HomeCatalog } from '@/components/store/home-catalog';
import { getActiveProducts, getStorefrontNavCategories } from '@/lib/catalog';

/** Dynamic so builds do not need DATABASE_URL; catalog is cached at runtime. */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, navCategories] = await Promise.all([
    getActiveProducts(),
    getStorefrontNavCategories(),
  ]);
  return <HomeCatalog products={products} navCategories={navCategories} />;
}
