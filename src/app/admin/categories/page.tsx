import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/actions/categories";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const parents = categories.filter((category) => !category.parentId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold">Categories</h1>
        <p className="mt-2 text-sm text-black/55">
          Use <span className="font-medium text-black">REP</span> and{" "}
          <span className="font-medium text-black">NON-REP</span> as parent categories. Put products in
          children (T-SHIRTS, SHOES, SHORTS, …) under the right parent. Only{" "}
          <span className="font-medium text-black">Visible</span> child categories appear as pills on
          the home page.
        </p>
      </div>

      <section className="border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Add category</h2>
        <form action={createCategory} className="mt-5 grid gap-4 md:grid-cols-6">
          <input name="name" required placeholder="Name" className="border border-black/15 px-3 py-2 md:col-span-2" />
          <input name="slug" placeholder="Slug" className="border border-black/15 px-3 py-2 md:col-span-2" />
          <select name="parentId" defaultValue="" className="border border-black/15 bg-white px-3 py-2">
            <option value="">No parent (top-level)</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
          <input name="sortOrder" type="number" placeholder="Sort" className="border border-black/15 px-3 py-2" />
          <label className="flex items-center gap-2 text-sm">
            <input name="isVisible" type="checkbox" defaultChecked />
            Visible
          </label>
          <input
            name="imageUrl"
            type="url"
            placeholder="Image URL"
            className="border border-black/15 px-3 py-2 md:col-span-3"
          />
          <input
            name="description"
            placeholder="Description"
            className="border border-black/15 px-3 py-2 md:col-span-2"
          />
          <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {categories.map((category) => (
          <form
            key={category.id}
            action={updateCategory.bind(null, category.id)}
            className="grid gap-3 border border-black/10 bg-white p-4 md:grid-cols-12"
          >
            <input
              name="name"
              defaultValue={category.name}
              className="border border-black/15 px-3 py-2 md:col-span-2"
            />
            <input
              name="slug"
              defaultValue={category.slug}
              className="border border-black/15 px-3 py-2 md:col-span-2"
            />
            <select
              name="parentId"
              defaultValue={category.parentId ?? ""}
              className="border border-black/15 bg-white px-3 py-2 md:col-span-2"
            >
              <option value="">No parent</option>
              {categories
                .filter((item) => item.id !== category.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <input
              name="description"
              defaultValue={category.description ?? ""}
              className="border border-black/15 px-3 py-2 md:col-span-3"
            />
            <input
              name="sortOrder"
              type="number"
              defaultValue={category.sortOrder}
              className="border border-black/15 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="isVisible" type="checkbox" defaultChecked={category.isVisible} />
              Visible
            </label>
            <div className="flex items-center justify-between gap-3 md:col-span-12">
              <p className="text-xs text-black/50">
                {category.parent ? `Under ${category.parent.name} · ` : "Top-level · "}
                {category._count.products} product(s)
              </p>
              <div className="flex gap-3">
                <button type="submit" className="underline underline-offset-4">
                  Save
                </button>
                <button
                  formAction={deleteCategory.bind(null, category.id)}
                  className="text-red-700 underline underline-offset-4"
                  type="submit"
                >
                  Delete
                </button>
              </div>
            </div>
          </form>
        ))}
        {!categories.length ? <p className="text-sm text-black/55">No categories yet.</p> : null}
      </section>
    </div>
  );
}
