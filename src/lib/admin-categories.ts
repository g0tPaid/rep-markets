import { prisma } from "@/lib/prisma";

export type AdminCategoryOption = {
  id: string;
  name: string;
  parentName: string | null;
  isVisible: boolean;
};

/** All categories for product forms (including hidden — visibility is storefront-only). */
export async function getAdminCategoryOptions(): Promise<AdminCategoryOption[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isVisible: true,
      parent: { select: { name: true, sortOrder: true } },
    },
  });

  return categories
    .slice()
    .sort((a, b) => {
      const aParent = a.parent?.name ?? "";
      const bParent = b.parent?.name ?? "";
      if (aParent !== bParent) return aParent.localeCompare(bParent);
      return a.name.localeCompare(b.name);
    })
    .map((category) => ({
      id: category.id,
      name: category.name,
      parentName: category.parent?.name ?? null,
      isVisible: category.isVisible,
    }));
}
