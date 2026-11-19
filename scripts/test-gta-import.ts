import assert from "node:assert/strict";
import { zipSync, unzipSync } from "fflate";
import {
  guessGtaCategory,
  gtaCategorySlug,
  gtaTitle,
  normalizeImagePath,
} from "../src/lib/gta-import";
import {
  applyManifest,
  groupByFolder,
  readManifest,
} from "../src/app/admin/gta-import/bulk-gta-importer";

const photo = (path: string, hash: string) => ({
  path,
  hash,
  file: new File(["test"], path),
  preview: "blob:test",
});
assert.equal(guessGtaCategory("gta-vi-desk-mat.jpg"), "Mouse Pads & Gaming");
assert.equal(guessGtaCategory("hoodie.jpeg"), "Hoodies & Sweatshirts");
assert.equal(guessGtaCategory("IMG001.jpg"), "Other GTA Merch");
assert.equal(gtaCategorySlug("Mugs & Drinkware"), "gta-6-mugs-drinkware");
assert.equal(gtaTitle("gta_vi_sunset_mug.jpg"), "GTA VI sunset mug");
assert.equal(
  normalizeImagePath("mugs\\sunset\\front.png"),
  "mugs/sunset/front.png",
);

const photos = [
  photo("mugs/sunset/front.jpg", "a"),
  photo("mugs/sunset/back.jpg", "b"),
  photo("loose.jpg", "c"),
];
const auto = groupByFolder(photos);
assert.equal(auto.length, 2);
assert.equal(auto[0].images.length, 2);
assert.equal(auto[0].category, "Mugs & Drinkware");
assert.equal(auto[1].price, "");
assert.equal(auto[1].stock, "");

const manifest = readManifest({
  version: 1,
  products: [
    {
      name: "GTA VI Mug",
      category: "Mugs & Drinkware",
      description: "GTA VI-inspired design",
      price: 17,
      stock: null,
      sizes: [],
      colors: [],
      tags: ["mug"],
      images: ["mugs/sunset/back.jpg", "mugs/sunset/front.jpg"],
    },
  ],
});
const prepared = applyManifest(photos, manifest);
assert.equal(prepared.groups.length, 2);
assert.equal(prepared.groups[0].images[0].hash, "b");
assert.equal(prepared.groups[0].price, "17");
assert.equal(prepared.groups[0].stock, "");
assert.equal(prepared.groups[1].images[0].hash, "c");
assert.equal(prepared.warnings.length, 1);
const duplicate = applyManifest(photos, {
  version: 1,
  products: [
    manifest.products[0],
    {
      ...manifest.products[0],
      name: "Duplicate",
      images: ["mugs/sunset/back.jpg"],
    },
  ],
});
assert.equal(duplicate.groups.length, 2);
assert.ok(
  duplicate.warnings.some((warning) => warning.includes("duplicate image")),
);
const ambiguous = applyManifest(
  [photo("one/front.jpg", "x"), photo("two/front.jpg", "y")],
  {
    version: 1,
    products: [{ ...manifest.products[0], images: ["front.jpg"] }],
  },
);
assert.equal(ambiguous.groups.length, 2);
assert.ok(
  ambiguous.warnings.some((warning) => warning.includes("ambiguous image")),
);
assert.throws(() =>
  readManifest({
    version: 1,
    products: [{ name: "Invalid", category: "unknown", images: ["test.jpg"] }],
  }),
);
const archive = zipSync({
  "gta-manifest.json": new TextEncoder().encode(JSON.stringify(manifest)),
  "mugs/sunset/front.jpg": new Uint8Array([1, 2, 3]),
});
const files = unzipSync(archive);
assert.equal(
  readManifest(JSON.parse(new TextDecoder().decode(files["gta-manifest.json"])))
    .products[0].name,
  "GTA VI Mug",
);
assert.deepEqual([...files["mugs/sunset/front.jpg"]], [1, 2, 3]);
console.log(
  "GTA importer tests passed (categories, grouping, manifest, ZIP, cover images and price/stock defaults).",
);
