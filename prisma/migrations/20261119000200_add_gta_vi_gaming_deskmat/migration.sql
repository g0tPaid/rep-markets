-- Add a single catalog entry requested by the store owner. Idempotent and non-destructive.
-- GTA 6 is its own hidden admin category; homepage tab discovery uses name/tags.
INSERT INTO "categories" ("id", "name", "slug", "description", "sortOrder", "isVisible", "parentId", "updatedAt")
VALUES (
  'repmarkets-category-gta-6', 'GTA 6', 'gta-6',
  'Gaming accessories and desk mats with GTA-inspired artwork',
  90, false, NULL, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "products" (
  "id", "name", "slug", "shortDescription", "longDescription", "brand",
  "price", "qualityPrices", "stock", "sizes", "colors", "tags",
  "status", "newArrival", "categoryId", "updatedAt"
)
VALUES (
  'repmarkets-gta-vi-mousepad-20261119',
  'GTA VI / GTA V Gaming Mouse Pad & Desk Mat',
  'gta-vi-v-gaming-mouse-pad-desk-mat',
  'GTA-themed gaming desk mat with selectable VI and V artwork. Three illustrated sizes.',
  'Upgrade your desk setup with a wide gaming mouse pad featuring GTA VI- and GTA V-inspired designs. Choose an artwork and the preferred size. Sizes pictured: 900 x 400 mm, 800 x 300 mm, or 300 x 250 mm. Pictures show the available design themes. This listing does not imply official Rockstar licensing.',
  'rep.markets',
  17.00,
  '{"NORMAL":17,"GOOD":17,"HIGH":17,"ONE_TO_ONE":17,"MIRROR":17}'::jsonb,
  1000,
  '["900 x 400 mm","800 x 300 mm","300 x 250 mm"]'::jsonb,
  '["GTA VI Couple & Car","GTA V Sunset","GTA VI Character Collage","GTA V Heist","GTA VI Pink Collage"]'::jsonb,
  '["gta 6","gta vi","gta v","gaming desk mat","mouse pad","accessories","flat-price"]'::jsonb,
  'ACTIVE'::"ProductStatus",
  true,
  (SELECT "id" FROM "categories" WHERE "slug" = 'gta-6' LIMIT 1),
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-0', p."id", '/images/products/gta-series-desk-mat/cover.webp', 'ITEM', 'Cover: GTA VI and GTA V gaming desk mat artwork designs', 0
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/cover.webp'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-1', p."id", '/images/products/gta-series-desk-mat/couple-car.webp', 'ITEM', 'VI couple and car mouse pad preview', 1
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/couple-car.webp'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-2', p."id", '/images/products/gta-series-desk-mat/city-sunset.webp', 'ITEM', 'GTA V sunset cityscape mouse pad preview', 2
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/city-sunset.webp'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-3', p."id", '/images/products/gta-series-desk-mat/vi-collage.webp', 'ITEM', 'GTA VI character collage mouse pad preview', 3
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/vi-collage.webp'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-4', p."id", '/images/products/gta-series-desk-mat/v-heist.webp', 'ITEM', 'GTA V heist artwork mouse pad preview', 4
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/v-heist.webp'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-mat-media-5', p."id", '/images/products/gta-series-desk-mat/vi-pink-collage.webp', 'ITEM', 'GTA VI pink collage mouse pad preview', 5
FROM "products" p
WHERE p."slug" = 'gta-vi-v-gaming-mouse-pad-desk-mat'
  AND NOT EXISTS (
    SELECT 1 FROM "product_media" existing
    WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-series-desk-mat/vi-pink-collage.webp'
  )
ON CONFLICT ("id") DO NOTHING;

