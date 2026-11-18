-- Publish the owner's GTA VI / R-star mug product, without altering existing GTA 6 products.
INSERT INTO "categories" ("id", "name", "slug", "description", "sortOrder", "isVisible", "parentId", "updatedAt")
VALUES (
  'repmarkets-category-gta-6', 'GTA 6', 'gta-6',
  'GTA-themed collectibles and desk accessories',
  90, false, NULL, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "products" (
  "id", "name", "slug", "shortDescription", "longDescription", "brand",
  "price", "qualityPrices", "stock", "sizes", "colors", "tags",
  "status", "newArrival", "categoryId", "updatedAt"
)
VALUES (
  'repmarkets-gta-vi-mugs-20261119',
  'GTA VI Logo & R-Star Gaming Coffee Mug',
  'gta-vi-logo-rstar-gaming-coffee-mug',
  'White gaming-themed mug with a choice of colorful GTA VI or R-star artwork.',
  'Add a gaming accent to your desk or coffee break. This glossy white printed mug is available with either a GTA VI-style logo or a colorful R-star motif. Select one design per mug. Listing photos are cropped to omit the original supplier overlay. Capacity and material have not been independently verified. Not represented as officially licensed merchandise.',
  'rep.markets',
  9.99,
  '{"NORMAL":9.99,"GOOD":9.99,"HIGH":9.99,"ONE_TO_ONE":9.99,"MIRROR":9.99}'::jsonb,
  1000,
  '[]'::jsonb,
  '["GTA VI Logo","Rockstar-Style R-Star Logo"]'::jsonb,
  '["gta 6","gta vi","gaming mug","coffee mug","gaming accessories","flat-price"]'::jsonb,
  'ACTIVE'::"ProductStatus",
  true,
  (SELECT "id" FROM "categories" WHERE "slug" = 'gta-6' LIMIT 1),
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-vi-mug-media-0', p."id", '/images/products/gta-vi-mugs/two-mugs.webp', 'ITEM', 'GTA VI-style and R-star mug designs together', 0
FROM "products" p
WHERE p."slug" = 'gta-vi-logo-rstar-gaming-coffee-mug' AND NOT EXISTS (
  SELECT 1 FROM "product_media" existing WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-vi-mugs/two-mugs.webp'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-vi-mug-media-1', p."id", '/images/products/gta-vi-mugs/vi-logo-mug.webp', 'ITEM', 'Close-up of GTA VI-style logo on white mug', 1
FROM "products" p
WHERE p."slug" = 'gta-vi-logo-rstar-gaming-coffee-mug' AND NOT EXISTS (
  SELECT 1 FROM "product_media" existing WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-vi-mugs/vi-logo-mug.webp'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-vi-mug-media-2', p."id", '/images/products/gta-vi-mugs/rockstar-logo-mug.webp', 'ITEM', 'Close-up of colorful R-star design on white mug', 2
FROM "products" p
WHERE p."slug" = 'gta-vi-logo-rstar-gaming-coffee-mug' AND NOT EXISTS (
  SELECT 1 FROM "product_media" existing WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-vi-mugs/rockstar-logo-mug.webp'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-vi-mug-media-3', p."id", '/images/products/gta-vi-mugs/angled-vi-mug.webp', 'ITEM', 'Angled view of GTA VI logo mug', 3
FROM "products" p
WHERE p."slug" = 'gta-vi-logo-rstar-gaming-coffee-mug' AND NOT EXISTS (
  SELECT 1 FROM "product_media" existing WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-vi-mugs/angled-vi-mug.webp'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_media" ("id", "productId", "url", "kind", "alt", "sortOrder")
SELECT 'repmarkets-gta-vi-mug-media-4', p."id", '/images/products/gta-vi-mugs/desk-mug-set.webp', 'ITEM', 'Pair of gaming mugs on the desk', 4
FROM "products" p
WHERE p."slug" = 'gta-vi-logo-rstar-gaming-coffee-mug' AND NOT EXISTS (
  SELECT 1 FROM "product_media" existing WHERE existing."productId" = p."id" AND existing."url" = '/images/products/gta-vi-mugs/desk-mug-set.webp'
)
ON CONFLICT ("id") DO NOTHING;

