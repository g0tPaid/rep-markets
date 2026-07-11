import Link from "next/link";
import { notFound } from "next/navigation";

import { updateOrderStatus } from "@/app/admin/actions/orders";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statuses = ["PENDING", "PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireAdmin();

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      user: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-black/55 underline underline-offset-4">
          Back to orders
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-black/45">Order</p>
            <h1 className="mt-2 text-3xl font-semibold">{order.number}</h1>
          </div>
          <form action={updateOrderStatus.bind(null, order.id)} className="flex gap-2">
            <select
              name="status"
              defaultValue={order.status}
              className="border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
              Update
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-black/10 bg-white p-5">
          <p className="text-sm text-black/50">Customer</p>
          <p className="mt-3 font-medium">{order.customerName}</p>
          <p className="mt-1 text-sm text-black/60">{order.email}</p>
          <p className="mt-1 text-sm text-black/60">{order.phone}</p>
        </div>
        <div className="border border-black/10 bg-white p-5">
          <p className="text-sm text-black/50">Shipping</p>
          {order.shippingAddress ? (
            <div className="mt-3 text-sm leading-6 text-black/70">
              <p className="font-medium text-black">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
              <p>
                {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-black/55">No shipping address saved.</p>
          )}
        </div>
        <div className="border border-black/10 bg-white p-5">
          <p className="text-sm text-black/50">Totals</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>{money(order.discount, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{money(order.shipping, order.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 font-semibold">
              <dt>Total</dt>
              <dd>{money(order.total, order.currency)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border border-black/10 bg-white">
        <div className="border-b border-black/10 p-5">
          <h2 className="text-lg font-semibold">Items</h2>
        </div>
        <div className="divide-y divide-black/10">
          {order.items.map((item) => (
            <div key={item.id} className="grid gap-2 p-5 text-sm md:grid-cols-5">
              <div className="font-medium md:col-span-2">{item.name}</div>
              <div>{[item.size, item.color].filter(Boolean).join(" / ") || "No variant"}</div>
              <div>Qty {item.quantity}</div>
              <div className="md:text-right">{money(item.unitPrice, order.currency)}</div>
            </div>
          ))}
        </div>
      </section>

      {order.notes ? (
        <section className="border border-black/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-3 text-sm text-black/65">{order.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
