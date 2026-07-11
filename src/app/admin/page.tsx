import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [productCount, orderCount, customerCount, revenue, settings, recentOrders, pendingOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { items: true },
      }),
    ]);

  const currency = settings?.currency ?? "USD";
  const cards = [
    { label: "Products", value: productCount.toLocaleString(), href: "/admin/products" },
    { label: "Orders", value: orderCount.toLocaleString(), href: "/admin/orders" },
    { label: "Customers", value: customerCount.toLocaleString(), href: "/admin/customers" },
    {
      label: "Revenue",
      value: money(Number(revenue._sum.total ?? 0), currency),
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-black/45">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex w-fit bg-black px-4 py-2 text-sm font-medium text-white"
        >
          New product
        </Link>
      </div>

      {pendingOrders.length ? (
        <section className="border-2 border-red-600 bg-red-50 p-5 text-red-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">New order notification</p>
              <p className="mt-2 text-lg font-semibold">
                {pendingOrders.length} pending order{pendingOrders.length === 1 ? "" : "s"} — contact for payment &amp; QC
              </p>
            </div>
            <Link
              href="/admin/orders?status=PENDING"
              className="bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              View pending
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {pendingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border border-red-200 bg-white px-4 py-3 text-sm text-black hover:border-red-400"
              >
                <span className="font-medium">{order.number}</span>
                <span>{order.customerName}</span>
                <span className="text-black/60">{order.phone}</span>
                <span className="font-medium">{money(Number(order.total), order.currency)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-black/10 bg-white p-5 shadow-sm transition hover:border-black/30"
          >
            <p className="text-sm text-black/50">{card.label}</p>
            <p className="mt-4 text-3xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="border border-black/10 bg-white">
        <div className="border-b border-black/10 p-5">
          <h2 className="text-lg font-semibold">Recent orders</h2>
        </div>
        {recentOrders.length ? (
          <div className="divide-y divide-black/10">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="grid gap-2 p-5 text-sm hover:bg-black/[0.02] md:grid-cols-5"
              >
                <span className="font-medium">{order.number}</span>
                <span>{order.customerName}</span>
                <span>{order.status}</span>
                <span>{order.items.length} item(s)</span>
                <span className="md:text-right">{money(Number(order.total), order.currency)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-black/55">
            No orders yet. Metrics will populate as customers place orders.
          </p>
        )}
      </section>
    </div>
  );
}
