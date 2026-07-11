import { HomeCatalog } from '@/components/store/home-catalog';
import { getActiveProducts } from '@/lib/catalog';

/** Cache the catalog briefly; admin mutations call revalidatePath('/'). */
export const revalidate = 60;

export default async function Home() {
  const products = await getActiveProducts();
  return <HomeCatalog products={products} />;
}
