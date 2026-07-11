import { updateSettings } from "@/app/admin/actions/settings";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings =
    (await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })) ??
    ({
      siteName: "rep.things",
      logoUrl: "",
      faviconUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      whatsappNumber: "",
      metaTitle: "",
      metaDescription: "",
      currency: "USD",
    } as const);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-black/45">Store</p>
        <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
      </div>

      <form action={updateSettings} className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="siteName">
            Site name
          </label>
          <input
            id="siteName"
            name="siteName"
            defaultValue={settings.siteName}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="currency">
            Currency
          </label>
          <input
            id="currency"
            name="currency"
            defaultValue={settings.currency}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="logoUrl">
            Logo URL
          </label>
          <input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={settings.logoUrl ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="faviconUrl">
            Favicon URL
          </label>
          <input
            id="faviconUrl"
            name="faviconUrl"
            type="url"
            defaultValue={settings.faviconUrl ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="instagramUrl">
            Instagram URL
          </label>
          <input
            id="instagramUrl"
            name="instagramUrl"
            type="url"
            defaultValue={settings.instagramUrl ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="tiktokUrl">
            TikTok URL
          </label>
          <input
            id="tiktokUrl"
            name="tiktokUrl"
            type="url"
            defaultValue={settings.tiktokUrl ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="whatsappNumber">
            WhatsApp number
          </label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            defaultValue={settings.whatsappNumber ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="metaTitle">
            Meta title
          </label>
          <input
            id="metaTitle"
            name="metaTitle"
            defaultValue={settings.metaTitle ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="metaDescription">
            Meta description
          </label>
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={4}
            defaultValue={settings.metaDescription ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <button type="submit" className="bg-black px-5 py-3 text-sm font-semibold text-white">
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
