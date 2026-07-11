import { HomeCatalog } from '@/components/store/home-catalog';
import { getActiveProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await getActiveProducts();
  return <HomeCatalog products={products} />;
}
