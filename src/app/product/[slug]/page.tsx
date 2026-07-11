import Link from 'next/link';
import { Header } from '@/components/store/header';
import { ProductDetails } from '@/components/store/product-details';
import { getProductPageData } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const data = await getProductPageData(slug);

  if (!data) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <section className="px-4 py-24 text-center">
          <p className="font-serif text-4xl tracking-[-0.05em]">This thing is gone.</p>
          <p className="mx-auto mt-4 max-w-[260px] text-sm leading-6 text-muted">
            The product may have been archived or renamed.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block border border-black px-5 py-4 text-[11px] font-semibold tracking-[0.22em]"
          >
            RETURN HOME
          </Link>
        </section>
      </main>
    );
  }

  return <ProductDetails product={data.product} related={data.related} />;
}
