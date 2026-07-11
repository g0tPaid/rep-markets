import { NextResponse } from 'next/server';
import { filterProducts, mockProducts, type ProductCategory } from '@/lib/products';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || 'ALL') as ProductCategory;
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get('limit') || 24)));
  const filtered = filterProducts(mockProducts, category);
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
