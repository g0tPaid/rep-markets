import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BulkGtaImporter } from "./bulk-gta-importer";

export const dynamic = "force-dynamic";

export default async function GtaImportPage() {
  await requireAdmin();
  const drafts = await prisma.product.findMany({
    where: { status: "DRAFT", sku: { startsWith: "GTA-BULK-" } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      tags: true,
      category: { select: { name: true } },
      media: { select: { url: true }, take: 1, orderBy: { sortOrder: "asc" } },
    },
  });
  return (
    <BulkGtaImporter
      savedDrafts={drafts.map((draft) => ({
        id: draft.id,
        name: draft.name,
        price: draft.price,
        stock: draft.stock,
        stockUnconfirmed:
          Array.isArray(draft.tags) &&
          draft.tags.includes("gta-import-stock-unconfirmed") &&
          draft.stock === 0,
        category: draft.category?.name || "GTA 6",
        image: draft.media[0]?.url || null,
      }))}
    />
  );
}
