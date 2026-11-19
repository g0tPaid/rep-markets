'use server';

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { parseQualityPrices, priceForQuality } from '@/lib/products';

class CheckoutUnavailableError extends Error {}

export type CheckoutItemInput = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  quality?: string;
  qualityLabel?: string;
  imageUrl?: string | null;
};

export type PlaceOrderInput = {
  email: string;
  phone: string;
  customerName: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
  items: CheckoutItemInput[];
  subtotal: number;
  shipping: number;
  total: number;
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; orderId: string }
  | { ok: false; error: string };

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const count = await tx.order.count();
  return `RM-${String(count + 1001).padStart(5, '0')}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    if (!input.items?.length) {
      return { ok: false, error: 'Your cart is empty.' };
    }

    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const customerName = input.customerName.trim();

    if (!email || !phone || !customerName || !input.line1.trim() || !input.city.trim() || !input.country.trim()) {
      return { ok: false, error: 'Please fill in all required fields.' };
    }

    const qualityNotes = input.items
      .map((item) => {
        const bits = [item.name, item.size, item.qualityLabel || item.quality].filter(Boolean);
        return `${bits.join(' / ')} × ${item.quantity}`;
      })
      .join('\n');

    const order = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds }, status: 'ACTIVE' }, select: { id: true, name: true, stock: true, price: true, salePrice: true, qualityPrices: true, tags: true } });
      const byId = new Map(products.map((product) => [product.id, product]));
      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product || !(product.price > 0) || !Number.isInteger(item.quantity) || item.quantity <= 0) throw new CheckoutUnavailableError('An item is not available to order yet. Remove it and refresh your cart.');
        const tags = Array.isArray(product.tags) ? product.tags : [];
        if (tags.includes('gta-bulk-import') && (product.stock <= 0 || item.quantity > product.stock)) throw new CheckoutUnavailableError(`${product.name} has unconfirmed or insufficient stock.`);
        const base = product.salePrice ?? product.price;
        const currentPrice = tags.includes('flat-price') ? base : priceForQuality(base, item.quality, parseQualityPrices(product.qualityPrices));
        if (!(currentPrice > 0) || !Number.isFinite(item.price) || Math.abs(item.price - currentPrice) > 0.01) throw new CheckoutUnavailableError(`The price of ${product.name} changed. Refresh the product and cart before ordering.`);
      }
      const number = await nextOrderNumber(tx);

      const address = await tx.address.create({
        data: {
          name: customerName,
          phone,
          email,
          line1: input.line1.trim(),
          line2: input.line2?.trim() || null,
          city: input.city.trim(),
          postalCode: input.postalCode.trim() || null,
          country: input.country.trim(),
        },
      });

      return tx.order.create({
        data: {
          number,
          status: 'PENDING',
          email,
          phone,
          customerName,
          notes: [
            'Customer placed order online. Contact for payment and QC.',
            input.notes?.trim() || '',
            'Items:',
            qualityNotes,
          ]
            .filter(Boolean)
            .join('\n'),
          subtotal: input.subtotal,
          shipping: input.shipping,
          total: input.total,
          currency: 'USD',
          shippingAddressId: address.id,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              name: item.qualityLabel ? `${item.name} · ${item.qualityLabel}` : item.name,
              size: item.size || null,
              color: item.color || null,
              quantity: item.quantity,
              unitPrice: item.price,
              imageUrl: item.imageUrl || null,
            })),
          },
        },
      });
    });

    return { ok: true, orderNumber: order.number, orderId: order.id };
  } catch (error) {
    if (error instanceof CheckoutUnavailableError) return { ok: false, error: error.message };
    console.error('placeOrder failed', error);
    return { ok: false, error: 'Could not place order. Please try again or message us on WhatsApp.' };
  }
}
