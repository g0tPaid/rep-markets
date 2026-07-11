import { createCoupon, deleteCoupon, updateCoupon } from "@/app/admin/actions/coupons";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminCouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">Sales</p>
        <h1 className="mt-2 text-3xl font-semibold">Coupons</h1>
      </div>

      <section className="border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Create coupon</h2>
        <form action={createCoupon} className="mt-5 grid gap-4 md:grid-cols-7">
          <input name="code" required placeholder="Code" className="border border-black/15 px-3 py-2" />
          <select name="type" defaultValue="PERCENTAGE" className="border border-black/15 bg-white px-3 py-2">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
          <input
            name="value"
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Value"
            className="border border-black/15 px-3 py-2"
          />
          <input name="expiresAt" type="date" className="border border-black/15 px-3 py-2" />
          <input
            name="usageLimit"
            type="number"
            min="0"
            placeholder="Usage limit"
            className="border border-black/15 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked />
            Active
          </label>
          <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {coupons.map((coupon) => (
          <form
            key={coupon.id}
            action={updateCoupon.bind(null, coupon.id)}
            className="grid gap-3 border border-black/10 bg-white p-4 md:grid-cols-8"
          >
            <input name="code" defaultValue={coupon.code} className="border border-black/15 px-3 py-2" />
            <select name="type" defaultValue={coupon.type} className="border border-black/15 bg-white px-3 py-2">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input
              name="value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={String(coupon.value)}
              className="border border-black/15 px-3 py-2"
            />
            <input
              name="expiresAt"
              type="date"
              defaultValue={dateInput(coupon.expiresAt)}
              className="border border-black/15 px-3 py-2"
            />
            <input
              name="usageLimit"
              type="number"
              min="0"
              defaultValue={coupon.usageLimit ?? ""}
              className="border border-black/15 px-3 py-2"
            />
            <div className="flex items-center text-sm text-black/60">
              Used {coupon.usedCount}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="isActive" type="checkbox" defaultChecked={coupon.isActive} />
              Active
            </label>
            <div className="flex items-center justify-end gap-3">
              <button type="submit" className="underline underline-offset-4">
                Save
              </button>
              <button
                formAction={deleteCoupon.bind(null, coupon.id)}
                type="submit"
                className="text-red-700 underline underline-offset-4"
              >
                Delete
              </button>
            </div>
          </form>
        ))}
        {!coupons.length ? <p className="text-sm text-black/55">No coupons yet.</p> : null}
      </section>
    </div>
  );
}
