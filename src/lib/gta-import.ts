export const GTA_CATEGORIES = [
  "T-Shirts",
  "Hoodies & Sweatshirts",
  "Caps & Headwear",
  "Mugs & Drinkware",
  "Phone Cases",
  "Mouse Pads & Gaming",
  "Posters & Wall Art",
  "Keychains",
  "Bags",
  "Collectibles",
  "Stickers & Decals",
  "Other GTA Merch",
] as const;

export type GtaCategory = (typeof GTA_CATEGORIES)[number];
export const GTA_IMPORT_TAG = "gta-bulk-import";
export const GTA_MAX_IMAGES_PER_PRODUCT = 15;
export const GTA_MAX_BATCH_IMAGES = 500;
export const GTA_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function slugifyGta(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function guessGtaCategory(name: string): GtaCategory {
  const rules: Array<[RegExp, GtaCategory]> = [
    [
      /mouse.?pad|desk.?mat|gaming.?pad|controller|keyboard/i,
      "Mouse Pads & Gaming",
    ],
    [/hoodie|sweatshirt|pullover/i, "Hoodies & Sweatshirts"],
    [/t.?shirt|tee\b|tshirt/i, "T-Shirts"],
    [/\bcap\b|beanie|hat\b|headwear/i, "Caps & Headwear"],
    [/mug|cup\b|tumbler|bottle/i, "Mugs & Drinkware"],
    [/phone.?case|iphone|samsung/i, "Phone Cases"],
    [/poster|wall.?art|canvas|print\b/i, "Posters & Wall Art"],
    [/key.?chain|keyring/i, "Keychains"],
    [/bag\b|backpack|tote/i, "Bags"],
    [/figure|figurine|collectible|statue/i, "Collectibles"],
    [/sticker|decal/i, "Stickers & Decals"],
  ];
  return (
    rules.find(([pattern]) => pattern.test(name))?.[1] ?? "Other GTA Merch"
  );
}

export function gtaCategorySlug(category: GtaCategory) {
  return `gta-6-${slugifyGta(category)}`;
}

export function gtaTitle(value: string) {
  const clean = value
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `GTA VI ${clean.replace(/^(?:gta\s*(?:6|vi)\s*)/i, "").trim() || "Merchandise"}`;
}

export function isGtaCategory(value: unknown): value is GtaCategory {
  return (
    typeof value === "string" &&
    (GTA_CATEGORIES as readonly string[]).includes(value)
  );
}

export function normalizeImagePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/");
}

export type ImportImage = { hash: string; url: string };
export type GtaDraftInput = {
  name: string;
  category: GtaCategory;
  description: string;
  price: number | null;
  stock: number | null;
  sizes: string[];
  colors: string[];
  tags: string[];
  images: ImportImage[];
};

export type ManifestProduct = Omit<GtaDraftInput, "images"> & {
  images: string[];
};
export type GtaManifest = { version: 1; products: ManifestProduct[] };
