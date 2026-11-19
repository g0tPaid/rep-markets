# GTA VI bulk import workflow

Admin: `/admin/gta-import` (admin account required).

## Owner / ChatGPT workflow

1. Send the original images or a ZIP to ChatGPT. Visual sorting takes place in that chat: classify the item type, group photos showing the same product, separate uncertain products, identify duplicate photos, choose a cover and prepare honest descriptions and tags. Do not claim licensing, materials, dimensions, stock or variants that are not confirmed.
2. ChatGPT returns a `gta-manifest.json` containing the relative image paths exactly as they occur in the ZIP. See `public/gta-import-example.json`. Use `null` for an unknown USD price or stock; use empty arrays for unconfirmed sizes/designs. The first image is the cover.
3. In GTA Bulk Import, drop the original ZIP and manifest (or a combined ZIP containing both). You may also import just photos and apply a manifest afterward. Filename/folder suggestions are not visual AI. Flat, unnamed images remain separate for manual review.
4. Confirm the groups on-screen. Merge selected groups, split a photo out, choose a different cover, fix names/categories and enter prices/stock. Category defaults fill blanks only.
5. Save as drafts. The upload and catalog creation are incremental, not one giant request. Each product has at most 15 photos; each photo is up to 8 MB and a batch up to 500 photos / 350 MB uncompressed. Use smaller batches if needed.
6. Saved products are in the database even if the page closes. Review or edit each draft in the normal product editor; use the saved-draft category filter and bulk price/stock controls to fill or revise an entire category without publishing it. Select the approved drafts and publish. A positive verified stock quantity, positive USD price and at least one photo are required for bulk publishing. The storefront automatically filters the GTA VI collection by actual product categories.

## Safeguards

- Exact file duplicates within a batch are removed by SHA-256. Product identity is based on the sorted image set and uniquely stored through the SKU. An exact re-import returns the existing product, not a second listing. Individual photo fingerprints are retained with product media to flag previous bulk imports, including overlapping groups. Visually similar but non-identical photos need review.
- Drafts are never public until explicitly selected and published. Existing product rows are never overwritten by this tool. The importer does not add invented variant choices or use fabricated stock. Unconfirmed prices/stock start at zero, and block bulk publication.
- Uses the existing admin-authenticated upload endpoint, which compresses images and stores them durably in Cloudinary when configured, otherwise Postgres. No per-batch website code deployment or migration is needed.
- The manifest is plain data, never executable code. Files are processed client-side before uploading; only selected draft photos are transmitted through the usual admin upload.
- Imported products use a `gta 6` tag, a dedicated category beneath the existing GTA 6 root, and a flat single price, preserving the existing REPS and NON-REPS presentation.
