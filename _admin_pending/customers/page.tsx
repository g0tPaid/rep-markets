import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function money(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdmin();

  const query = (await searchParams)?.q?.trim() ?? "";
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      orders: {
        select: { total: true },
      },
      addresses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">People</p>
        <h1 className="mt-2 text-3xl font-semibold">Customers</h1>
      </div>

      <form action="/admin/customers">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search customers"
          className="w-full border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
      </form>

      <section className="overflow-hidden border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-black/10 bg-neutral-50 text-black/55">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Spend</th>
                <th className="px-4 py-3 font-medium">Addresses</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {customers.map((customer) => {
                const spend = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);

                return (
                  <tr key={customer.id}>
                    <td className="px-4 py-4">
                      <div className="font-medium">{customer.name ?? "Unnamed customer"}</div>
                      <div className="mt-1 text-xs text-black/50">{customer.email}</div>
                    </td>
                    <td className="px-4 py-4">{customer.phone ?? "Not provided"}</td>
                    <td className="px-4 py-4">{customer.orders.length}</td>
                    <td className="px-4 py-4">{money(spend)}</td>
                    <td className="px-4 py-4">{customer.addresses.length}</td>
                    <td className="px-4 py-4">{customer.createdAt.toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!customers.length ? <p className="p-5 text-sm text-black/55">No customers found.</p> : null}
      </section>
    </div>
  );
}
