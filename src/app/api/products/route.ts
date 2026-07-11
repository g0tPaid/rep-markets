import { NextResponse } from 'next/server';
import { getActiveProducts, getActiveProductsByIds } from '@/lib/catalog';
import { filterProducts, type ProductCategory, type ProductView } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || 'ALL') as ProductCategory;
  const view = (searchParams.get('view') || 'REPS') as ProductView;
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get('limit') || 24)));
  const idsParam = searchParams.get('ids');

  if (idsParam) {
    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
    const data = await getActiveProductsByIds(ids);
    return NextResponse.json({ data });
  }

  const catalog = await getActiveProducts();
  const filtered = filterProducts(catalog, category, view);
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    },
  });
}
