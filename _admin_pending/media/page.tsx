import { createMediaAsset, deleteMediaAsset } from "@/app/admin/actions/media";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireAdmin();

  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">Assets</p>
        <h1 className="mt-2 text-3xl font-semibold">Media</h1>
      </div>

      <section className="border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Add media URL</h2>
        <form action={createMediaAsset} className="mt-5 grid gap-4 md:grid-cols-6">
          <input name="url" type="url" required placeholder="URL" className="border border-black/15 px-3 py-2 md:col-span-2" />
          <input name="name" placeholder="Name" className="border border-black/15 px-3 py-2" />
          <input name="folder" placeholder="Folder" defaultValue="uploads" className="border border-black/15 px-3 py-2" />
          <select name="type" defaultValue="IMAGE" className="border border-black/15 bg-white px-3 py-2">
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>
          <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
            Add
          </button>
          <input name="publicId" placeholder="Public ID" className="border border-black/15 px-3 py-2 md:col-span-2" />
          <input name="width" type="number" placeholder="Width" className="border border-black/15 px-3 py-2" />
          <input name="height" type="number" placeholder="Height" className="border border-black/15 px-3 py-2" />
        </form>
      </section>

      {assets.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="border border-black/10 bg-white">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {asset.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.name ?? "Media asset"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-black/50">Video</div>
                )}
              </div>
              <div className="space-y-2 p-4 text-sm">
                <p className="font-medium">{asset.name ?? "Untitled asset"}</p>
                <p className="truncate text-black/50">{asset.url}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-black/40">{asset.folder}</span>
                  <form action={deleteMediaAsset.bind(null, asset.id)}>
                    <button type="submit" className="text-red-700 underline underline-offset-4">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-sm text-black/55">No media assets yet.</p>
      )}
    </div>
  );
}
