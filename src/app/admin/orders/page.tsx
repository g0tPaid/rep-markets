import Link from "next/link";

import { OrderStatus } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>;
};

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

const orderStatuses = ["PENDING", "PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const status = orderStatuses.includes(params?.status as (typeof orderStatuses)[number])
    ? (params?.status as OrderStatus)
    : "";

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { number: { contains: query, mode: "insensitive" } },
              { customerName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold">Orders</h1>
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_180px_auto]" action="/admin/orders">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search orders"
          className="border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        >
          <option value="">All statuses</option>
          {orderStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button type="submit" className="border border-black px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      <section className="overflow-hidden border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-black/10 bg-neutral-50 text-black/55">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium">{order.number}</div>
                    <div className="mt-1 text-xs text-black/50">
                      {order.createdAt.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>{order.customerName}</div>
                    <div className="mt-1 text-xs text-black/50">{order.email}</div>
                  </td>
                  <td className="px-4 py-4">{order.status}</td>
                  <td className="px-4 py-4">{order.items.length}</td>
                  <td className="px-4 py-4">{money(order.total, order.currency)}</td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length ? <p className="p-5 text-sm text-black/55">No orders found.</p> : null}
      </section>
    </div>
  );
}
