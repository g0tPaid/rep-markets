import { HomeCatalog } from '@/components/store/home-catalog';
import { getActiveProducts } from '@/lib/catalog';

/** Dynamic so builds do not need DATABASE_URL; catalog is cached at runtime. */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await getActiveProducts();
  return <HomeCatalog products={products} />;
}
