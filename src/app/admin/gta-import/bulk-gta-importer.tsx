"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews and admin thumbnails do not need Next image optimization. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { unzipSync } from "fflate";
import {
  GTA_CATEGORIES,
  GTA_MAX_BATCH_IMAGES,
  GTA_MAX_IMAGE_BYTES,
  GTA_MAX_IMAGES_PER_PRODUCT,
  guessGtaCategory,
  gtaTitle,
  isGtaCategory,
  normalizeImagePath,
  type GtaCategory,
  type GtaManifest,
} from "@/lib/gta-import";

type Photo = {
  hash: string;
  path: string;
  file: File;
  preview: string;
  uploaded?: string;
};
type Group = {
  id: string;
  images: Photo[];
  name: string;
  category: GtaCategory;
  description: string;
  price: string;
  stock: string;
  sizes: string;
  colors: string;
  tags: string;
  state?: "saving" | "saved" | "error";
  message?: string;
};
type SavedDraft = {
  id: string;
  name: string;
  price: number;
  stock: number;
  stockUnconfirmed: boolean;
  category: string;
  image: string | null;
};

const field =
  "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-fuchsia-600";
const primary =
  "rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const secondary =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:border-neutral-700 disabled:opacity-40";
const imagePattern = /\.(?:jpe?g|png|webp|gif)$/i;
const MAX_TOTAL = 350 * 1024 * 1024;

function mime(path: string) {
  return /\.png$/i.test(path)
    ? "image/png"
    : /\.webp$/i.test(path)
      ? "image/webp"
      : /\.gif$/i.test(path)
        ? "image/gif"
        : "image/jpeg";
}
function csv(value: string) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function numeric(value: string) {
  return value.trim() === "" ? null : Number(value);
}
function groupFor(images: Photo[], hint: string): Group {
  return {
    id: crypto.randomUUID(),
    images,
    name: gtaTitle(hint),
    category: guessGtaCategory(hint),
    description: "",
    price: "",
    stock: "",
    sizes: "",
    colors: "",
    tags: "",
  };
}
async function digest(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function api(body: unknown) {
  const response = await fetch("/api/admin/gta-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}
async function upload(photo: Photo) {
  if (photo.uploaded) return photo.uploaded;
  const data = new FormData();
  data.append("file", photo.file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: data,
  });
  const result = await response.json();
  if (!response.ok || !result.url)
    throw new Error(result.error || `Could not upload ${photo.path}.`);
  photo.uploaded = result.url;
  return photo.uploaded!;
}

export function readManifest(raw: unknown): GtaManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("The manifest must be a JSON object.");
  const data = raw as GtaManifest;
  if (
    data.version !== 1 ||
    !Array.isArray(data.products) ||
    data.products.length > GTA_MAX_BATCH_IMAGES
  )
    throw new Error("Manifest must contain version: 1 and a products array.");
  for (const p of data.products) {
    if (
      !p ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      !isGtaCategory(p.category) ||
      !Array.isArray(p.images) ||
      !p.images.length ||
      p.images.length > GTA_MAX_IMAGES_PER_PRODUCT ||
      p.images.some((i) => typeof i !== "string")
    )
      throw new Error(
        "Manifest has an invalid product name, category, or image list.",
      );
  }
  return data;
}

export function applyManifest(photos: Photo[], manifest: GtaManifest) {
  const byPath = new Map(photos.map((p) => [p.path.toLowerCase(), p]));
  const used = new Set<string>();
  const groups: Group[] = [];
  const warnings: string[] = [];
  for (const product of manifest.products) {
    const images: Photo[] = [];
    for (const path of product.images) {
      const key = normalizeImagePath(path).toLowerCase();
      const exact = byPath.get(key);
      const matches = exact
        ? [exact]
        : photos.filter(
            (p) =>
              p.path.toLowerCase().split("/").pop() === key.split("/").pop(),
          );
      if (matches.length !== 1) {
        warnings.push(`${product.name}: missing or ambiguous image ${path}`);
        continue;
      }
      const image = matches[0];
      if (used.has(image.hash)) {
        warnings.push(`${product.name}: duplicate image ${path}`);
        continue;
      }
      used.add(image.hash);
      images.push(image);
    }
    if (!images.length) continue;
    const g = groupFor(images, product.name);
    groups.push({
      ...g,
      name: product.name,
      category: product.category,
      description:
        typeof product.description === "string" ? product.description : "",
      price: typeof product.price === "number" ? String(product.price) : "",
      stock: typeof product.stock === "number" ? String(product.stock) : "",
      sizes: Array.isArray(product.sizes)
        ? product.sizes.filter((x) => typeof x === "string").join(", ")
        : "",
      colors: Array.isArray(product.colors)
        ? product.colors.filter((x) => typeof x === "string").join(", ")
        : "",
      tags: Array.isArray(product.tags)
        ? product.tags.filter((x) => typeof x === "string").join(", ")
        : "",
    });
  }
  const remaining = photos.filter((p) => !used.has(p.hash));
  if (remaining.length)
    warnings.push(
      `${remaining.length} image(s) were not assigned by the manifest and remain separate for review.`,
    );
  return {
    groups: [
      ...groups,
      ...remaining.map((p) => groupFor([p], p.path.split("/").pop()!)),
    ],
    warnings,
  };
}

export function groupByFolder(photos: Photo[]) {
  const buckets = new Map<string, Photo[]>();
  for (const photo of photos) {
    const segments = photo.path.split("/");
    // Explicit product folders (category/product/images) are safe suggestions; flat photos stay separate.
    const key =
      segments.length >= 3 ? segments.slice(0, -1).join("/") : photo.path;
    buckets.set(key, [...(buckets.get(key) || []), photo]);
  }
  return [...buckets.entries()].flatMap(([key, images]) => {
    const hint = key.split("/").pop() || key;
    if (images.length > GTA_MAX_IMAGES_PER_PRODUCT)
      return images.map((p) => groupFor([p], p.path.split("/").pop()!));
    const group = groupFor(images, hint);
    return [{ ...group, category: guessGtaCategory(key) }];
  });
}

export function BulkGtaImporter({
  savedDrafts,
}: {
  savedDrafts: SavedDraft[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [draftSelected, setDraftSelected] = useState<string[]>([]);
  const [draftCategory, setDraftCategory] = useState("ALL");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftStock, setDraftStock] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [categoryPrices, setCategoryPrices] = useState<Record<string, string>>(
    {},
  );
  const [defaultStock, setDefaultStock] = useState("");
  const [query, setQuery] = useState("");
  const previews = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const manifestInput = useRef<HTMLInputElement>(null);
  const retained = groups.flatMap((g) => g.images);
  const pending = groups.filter((g) => g.state !== "saved");
  const shown = groups.filter(
    (g) =>
      !query ||
      `${g.name} ${g.category} ${g.images.map((p) => p.path).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function update(id: string, patch: Partial<Group>) {
    setGroups((current) =>
      current.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function ingest(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setNotice("");
    setProgress("Reading images…");
    try {
      const entries: Array<{ path: string; file: File }> = [];
      let manifest: GtaManifest | null = null;
      let total = 0;
      function add(path: string, file: File) {
        if (
          !imagePattern.test(path) ||
          path.startsWith("__MACOSX/") ||
          path.split("/").some((part) => part.startsWith("."))
        )
          return;
        if (file.size > GTA_MAX_IMAGE_BYTES)
          throw new Error(
            `${path} is larger than 8 MB. Resize it and try again.`,
          );
        total += file.size;
        if (
          total > MAX_TOTAL ||
          entries.length + retained.length >= GTA_MAX_BATCH_IMAGES
        )
          throw new Error(
            "Batch limit: 500 images and 350 MB of uncompressed image data. Split your batch.",
          );
        entries.push({ path: normalizeImagePath(path), file });
      }
      for (const file of files) {
        if (/\.zip$/i.test(file.name)) {
          if (file.size > MAX_TOTAL)
            throw new Error("ZIP is too large. Split it into smaller batches.");
          let count = 0;
          let expanded = 0;
          const extracted = unzipSync(
            new Uint8Array(await file.arrayBuffer()),
            {
              filter: (item) => {
                const path = normalizeImagePath(item.name);
                const isManifest =
                  /(?:^|\/)(?:gta-manifest|manifest)\.json$/i.test(path);
                if (
                  (!imagePattern.test(path) && !isManifest) ||
                  path.startsWith("__MACOSX/") ||
                  path.split("/").some((part) => part.startsWith("."))
                )
                  return false;
                if (path.startsWith("/") || path.split("/").includes(".."))
                  throw new Error("Invalid ZIP path.");
                count++;
                expanded += item.originalSize;
                if (
                  count > GTA_MAX_BATCH_IMAGES + 1 ||
                  expanded > MAX_TOTAL ||
                  item.originalSize >
                    (isManifest ? 2 * 1024 * 1024 : GTA_MAX_IMAGE_BYTES)
                )
                  throw new Error(
                    "ZIP exceeds the batch or individual-image limit.",
                  );
                return true;
              },
            },
          );
          for (const [path, bytes] of Object.entries(extracted)) {
            if (/\.(?:json)$/i.test(path)) {
              manifest = readManifest(
                JSON.parse(new TextDecoder().decode(bytes)),
              );
              continue;
            }
            add(
              path,
              new File([new Uint8Array(bytes)], path.split("/").pop() || path, {
                type: mime(path),
              }),
            );
          }
        } else if (/\.json$/i.test(file.name)) {
          if (file.size > 2 * 1024 * 1024)
            throw new Error("Manifest exceeds 2 MB.");
          manifest = readManifest(JSON.parse(await file.text()));
        } else add(file.webkitRelativePath || file.name, file);
      }
      const seen = new Set(retained.map((p) => p.hash));
      const photos: Photo[] = [];
      let duplicates = 0;
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const hash = await digest(entry.file);
        if (seen.has(hash)) {
          duplicates++;
          continue;
        }
        seen.add(hash);
        const preview = URL.createObjectURL(entry.file);
        previews.current.push(preview);
        photos.push({ ...entry, hash, preview });
        if (index % 15 === 0)
          setProgress(`Reading image ${index + 1} of ${entries.length}…`);
      }
      const allPhotos = [...retained, ...photos];
      if (!allPhotos.length) throw new Error("No supported images found.");
      if (manifest) {
        if (groups.some((g) => g.state === "saved"))
          throw new Error("Reload before applying a manifest to a new batch.");
        const result = applyManifest(allPhotos, manifest);
        setGroups(result.groups);
        setSelected([]);
        setNotice(
          [
            `${photos.length} new images, ${duplicates} exact duplicates skipped. AI manifest applied.`,
            ...result.warnings,
          ].join(" "),
        );
      } else {
        setGroups((current) => [...current, ...groupByFolder(photos)]);
        setNotice(
          `${photos.length} images added · ${duplicates} exact duplicates skipped. Group by folder or merge photos, then confirm categories.`,
        );
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not import files.");
    } finally {
      setBusy(false);
      setProgress("");
      if (fileInput.current) fileInput.current.value = "";
      if (manifestInput.current) manifestInput.current.value = "";
    }
  }

  function merge() {
    const candidates = groups.filter(
      (g) => selected.includes(g.id) && g.state !== "saved",
    );
    if (candidates.length < 2) return;
    const images = candidates.flatMap((g) => g.images);
    if (images.length > GTA_MAX_IMAGES_PER_PRODUCT) {
      setNotice("Each product may have up to 15 images. Select fewer groups.");
      return;
    }
    const first = candidates[0];
    setGroups((current) =>
      current.flatMap((g) =>
        g.id === first.id
          ? [{ ...first, images, state: undefined, message: undefined }]
          : candidates.some((c) => c.id === g.id)
            ? []
            : [g],
      ),
    );
    setSelected([]);
  }
  function split(id: string, hash: string) {
    const g = groups.find((g) => g.id === id);
    if (!g || g.images.length < 2) return;
    const image = g.images.find((p) => p.hash === hash);
    if (!image) return;
    setGroups((current) =>
      current.flatMap((row) =>
        row.id !== id
          ? [row]
          : [
              { ...row, images: row.images.filter((p) => p.hash !== hash) },
              groupFor([image], image.path.split("/").pop()!),
            ],
      ),
    );
  }

  function applyDefaults() {
    setGroups((current) =>
      current.map((g) =>
        g.state === "saved"
          ? g
          : {
              ...g,
              price: g.price || categoryPrices[g.category] || "",
              stock: g.stock || defaultStock,
            },
      ),
    );
    setNotice("Defaults applied to blank prices and stock only.");
  }

  async function saveDrafts() {
    const targets = pending.filter(
      (g) => !selected.length || selected.includes(g.id),
    );
    if (!targets.length) return;
    setBusy(true);
    setNotice("");
    let saved = 0;
    let failed = 0;
    for (let index = 0; index < targets.length; index++) {
      const g = targets[index];
      setProgress(
        `Saving product ${index + 1} of ${targets.length}: ${g.name}`,
      );
      update(g.id, { state: "saving", message: undefined });
      try {
        if (!g.name.trim()) throw new Error("Product name is required.");
        const price = numeric(g.price),
          stock = numeric(g.stock);
        if (price !== null && (!Number.isFinite(price) || price <= 0))
          throw new Error("Price must be positive or left blank for draft.");
        if (stock !== null && (!Number.isInteger(stock) || stock < 0))
          throw new Error(
            "Stock must be a whole non-negative number or blank.",
          );
        const result = await api({
          action: "lookup",
          hashes: g.images.map((p) => p.hash),
        });
        if (result.existing) {
          update(g.id, {
            state: "saved",
            message: `Already exists: ${result.existing.name}`,
          });
          saved++;
          continue;
        }
        if (result.conflict)
          throw new Error(
            `A photo is already listed under ${result.conflict}. Review this group.`,
          );
        const images = [];
        for (const photo of g.images)
          images.push({ hash: photo.hash, url: await upload(photo) });
        const uploaded = await api({
          action: "create",
          draft: {
            name: g.name,
            category: g.category,
            description: g.description,
            price,
            stock,
            sizes: csv(g.sizes),
            colors: csv(g.colors),
            tags: csv(g.tags),
            images,
          },
        });
        update(g.id, {
          state: "saved",
          message: uploaded.existing ? "Already imported" : "Draft saved",
        });
        saved++;
      } catch (err) {
        failed++;
        update(g.id, {
          state: "error",
          message: err instanceof Error ? err.message : "Import failed.",
        });
      }
    }
    setBusy(false);
    setProgress("");
    setSelected([]);
    setNotice(
      `${saved} product(s) saved or already present; ${failed} need attention. Nothing has been published.`,
    );
    router.refresh();
  }

  async function publish() {
    if (!draftSelected.length || busy) return;
    if (
      !window.confirm(
        `Publish ${draftSelected.length} reviewed GTA VI product(s) to the live store?`,
      )
    )
      return;
    setBusy(true);
    setProgress("Publishing selected drafts…");
    setNotice("");
    try {
      const result = await api({ action: "publish", ids: draftSelected });
      setNotice(`${result.published} GTA VI product(s) published.`);
      setDraftSelected([]);
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function updateSavedDrafts() {
    if (!draftSelected.length || busy) return;
    const price = numeric(draftPrice),
      stock = numeric(draftStock);
    if (price === null && stock === null) {
      setNotice("Enter a price or stock quantity.");
      return;
    }
    if (
      !window.confirm(
        `Apply the entered price/stock to ${draftSelected.length} selected draft(s)? Nothing will be published.`,
      )
    )
      return;
    setBusy(true);
    setProgress("Updating selected drafts…");
    setNotice("");
    try {
      const result = await api({
        action: "update-drafts",
        ids: draftSelected,
        price,
        stock,
      });
      setNotice(`${result.updated} private drafts updated.`);
      setDraftPrice("");
      setDraftStock("");
      router.refresh();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not update drafts.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const categoriesUsed = [...new Set(pending.map((g) => g.category))];
  const eligible = savedDrafts.filter(
    (draft) =>
      draft.price > 0 &&
      draft.stock > 0 &&
      !draft.stockUnconfirmed &&
      draft.image,
  );
  const shownDrafts = savedDrafts.filter(
    (draft) => draftCategory === "ALL" || draft.category === draftCategory,
  );
  const selectedReady =
    draftSelected.length > 0 &&
    draftSelected.every((id) => eligible.some((draft) => draft.id === id));
  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-neutral-950 p-6 text-white sm:p-8">
        <p className="text-xs font-bold tracking-[.23em] text-fuchsia-300">
          GTA VI MERCH · ADMIN
        </p>
        <h1 className="mt-2 text-3xl font-bold">Bulk product importer</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Upload hundreds of photos, group them into products, review prices and
          stock, save private drafts, then publish the selected items. Existing
          products are never overwritten.
        </p>
      </header>
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold">
          1. Upload photos or an AI-prepared catalog
        </h2>
        <p className="text-sm text-neutral-600">
          Choose up to 500 JPG, PNG, WEBP or GIF images, a ZIP, or a ZIP
          containing <code>gta-manifest.json</code>. For visual AI sorting, give
          your mixed images to ChatGPT first and import its manifest alongside
          the original photos. Without a manifest, filenames and explicit
          product folders suggest categories; uncertain photos stay separate.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.zip,.json"
            multiple
            hidden
            onChange={(e) => void ingest(Array.from(e.target.files || []))}
          />
          <button
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className={primary}
          >
            Choose images or ZIP
          </button>
          <input
            ref={manifestInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => void ingest(Array.from(e.target.files || []))}
          />
          <button
            disabled={
              busy ||
              !retained.length ||
              groups.some((g) => g.state === "saved")
            }
            onClick={() => manifestInput.current?.click()}
            className={secondary}
          >
            Apply AI manifest
          </button>
          <a href="/gta-import-example.json" download className={secondary}>
            Manifest example
          </a>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void ingest(Array.from(e.dataTransfer.files));
          }}
          className="rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500"
        >
          Drop a ZIP or multiple image files here · maximum 8 MB per photo
        </div>
      </section>
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-neutral-800"
        >
          {notice}
        </p>
      )}
      {busy && (
        <p
          role="status"
          className="sticky top-20 z-20 rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white"
        >
          {progress}
        </p>
      )}
      {groups.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                2. Review product groups
              </h2>
              <p className="text-sm text-neutral-500">
                {retained.length} photos · {groups.length} products ·{" "}
                {pending.length} not yet saved
              </p>
            </div>
            <button
              disabled={busy || selected.length < 2}
              onClick={merge}
              className={secondary}
            >
              Merge selected ({selected.length})
            </button>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="font-medium">Bulk defaults</h3>
            <p className="text-xs text-neutral-500">
              Enter category prices in USD and a verified stock quantity if
              applicable. Blank values remain unconfirmed drafts.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoriesUsed.map((category) => (
                <label key={category} className="text-xs font-medium">
                  {category}
                  <input
                    aria-label={`${category} default price`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={field}
                    placeholder="USD"
                    value={categoryPrices[category] || ""}
                    onChange={(e) =>
                      setCategoryPrices((prices) => ({
                        ...prices,
                        [category]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <label className="text-xs font-medium">
                Stock default
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={field}
                  placeholder="Unconfirmed"
                  value={defaultStock}
                  onChange={(e) => setDefaultStock(e.target.value)}
                />
              </label>
            </div>
            <button
              className={`${secondary} mt-3`}
              disabled={busy}
              onClick={applyDefaults}
            >
              Apply defaults to blank fields
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${field} max-w-sm`}
              placeholder="Search product groups or filenames"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              disabled={busy}
              className={secondary}
              onClick={() =>
                setSelected(
                  shown.filter((g) => g.state !== "saved").map((g) => g.id),
                )
              }
            >
              Select visible
            </button>
            <button
              disabled={busy}
              className={secondary}
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {shown.map((g) => (
              <article
                key={g.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      disabled={busy || g.state === "saved"}
                      onChange={() => toggle(g.id)}
                    />{" "}
                    {g.images.length} photo(s)
                  </label>
                  <span className="text-xs font-semibold text-neutral-500">
                    {g.state === "saved"
                      ? "SAVED"
                      : g.state === "error"
                        ? "NEEDS REVIEW"
                        : "DRAFT PREVIEW"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {g.images.map((p, index) => (
                    <div key={p.hash} className="w-24 shrink-0 space-y-1">
                      <div className="relative aspect-square rounded-md border bg-neutral-50 overflow-hidden">
                        <img
                          src={p.preview}
                          alt={p.path}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 left-0 bg-black/75 px-1 text-[9px] text-white">
                          {index === 0 ? "COVER" : index + 1}
                        </span>
                      </div>
                      <p className="truncate text-[10px]" title={p.path}>
                        {p.path.split("/").pop()}
                      </p>
                      {g.images.length > 1 && !busy && g.state !== "saved" && (
                        <div className="flex gap-1 text-[10px]">
                          <button
                            className="underline"
                            onClick={() =>
                              update(g.id, {
                                images: [
                                  p,
                                  ...g.images.filter((i) => i.hash !== p.hash),
                                ],
                              })
                            }
                          >
                            Cover
                          </button>
                          <button
                            className="underline"
                            onClick={() => split(g.id, p.hash)}
                          >
                            Split
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <fieldset
                  disabled={busy || g.state === "saved"}
                  className="space-y-2 disabled:opacity-60"
                >
                  <label className="block text-xs font-semibold">
                    Product name
                    <input
                      maxLength={150}
                      className={field}
                      value={g.name}
                      onChange={(e) => update(g.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Category
                    <select
                      className={field}
                      value={g.category}
                      onChange={(e) =>
                        update(g.id, {
                          category: e.target.value as GtaCategory,
                        })
                      }
                    >
                      {GTA_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold">
                    Description
                    <textarea
                      className={field}
                      rows={2}
                      maxLength={3000}
                      placeholder="Add verified details; no invented materials, sizes or licensing."
                      value={g.description}
                      onChange={(e) =>
                        update(g.id, { description: e.target.value })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold">
                      Price (USD)
                      <input
                        className={field}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Unconfirmed"
                        value={g.price}
                        onChange={(e) =>
                          update(g.id, { price: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold">
                      Stock
                      <input
                        className={field}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Unconfirmed"
                        value={g.stock}
                        onChange={(e) =>
                          update(g.id, { stock: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold">
                      Sizes (comma separated)
                      <input
                        className={field}
                        value={g.sizes}
                        onChange={(e) =>
                          update(g.id, { sizes: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold">
                      Colors / designs
                      <input
                        className={field}
                        value={g.colors}
                        onChange={(e) =>
                          update(g.id, { colors: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold">
                    Search tags
                    <input
                      className={field}
                      value={g.tags}
                      onChange={(e) => update(g.id, { tags: e.target.value })}
                    />
                  </label>
                </fieldset>
                {g.message && (
                  <p
                    className={`text-xs ${g.state === "error" ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {g.message}
                  </p>
                )}
                {g.state !== "saved" && (
                  <button
                    disabled={busy}
                    className="text-xs text-red-700 underline"
                    onClick={() => {
                      setGroups((rows) =>
                        rows.filter((row) => row.id !== g.id),
                      );
                      setSelected((ids) => ids.filter((id) => id !== g.id));
                    }}
                  >
                    Remove from preview
                  </button>
                )}
              </article>
            ))}
          </div>
          <button
            className={primary}
            disabled={busy || !pending.length}
            onClick={() => void saveDrafts()}
          >
            Save {selected.length ? "selected" : "all"} as private drafts
          </button>
        </section>
      )}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">3. Saved drafts & publish</h2>
            <p className="text-sm text-neutral-500">
              {savedDrafts.length} unpublished bulk-import product(s) ·{" "}
              {eligible.length} ready for selection
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={secondary}
              disabled={busy || !shownDrafts.length}
              onClick={() => setDraftSelected(shownDrafts.map((g) => g.id))}
            >
              Select visible
            </button>
            <button
              className={secondary}
              disabled={busy || !eligible.length}
              onClick={() => setDraftSelected(eligible.map((g) => g.id))}
            >
              Select all ready
            </button>
            <button
              className={secondary}
              disabled={busy || !draftSelected.length}
              onClick={() => setDraftSelected([])}
            >
              Clear selection
            </button>
          </div>
        </div>
        {!!savedDrafts.length && (
          <div className="space-y-3 rounded-lg bg-neutral-50 p-3">
            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-xs font-semibold">
                Filter by category
                <select
                  className={field}
                  value={draftCategory}
                  disabled={busy}
                  onChange={(e) => {
                    setDraftCategory(e.target.value);
                    setDraftSelected([]);
                  }}
                >
                  <option value="ALL">All drafts</option>
                  {[...new Set(savedDrafts.map((draft) => draft.category))]
                    .sort()
                    .map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                Price for selected (USD)
                <input
                  className={field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                  placeholder="Leave unchanged"
                  disabled={busy}
                />
              </label>
              <label className="text-xs font-semibold">
                Stock for selected
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="1"
                  value={draftStock}
                  onChange={(e) => setDraftStock(e.target.value)}
                  placeholder="Leave unchanged"
                  disabled={busy}
                />
              </label>
              <button
                className={secondary}
                disabled={
                  busy || !draftSelected.length || (!draftPrice && !draftStock)
                }
                onClick={() => void updateSavedDrafts()}
              >
                Update selected drafts
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Apply prices or verified stock to selected private drafts,
              including a whole category. Blank fields stay unchanged.
            </p>
          </div>
        )}
        {savedDrafts.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Saved products will appear here. You can close this page and return
            to review them later.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {shownDrafts.map((g) => {
              return (
                <div className="flex items-center gap-3 py-3" key={g.id}>
                  <input
                    aria-label={`Select ${g.name}`}
                    type="checkbox"
                    disabled={busy}
                    checked={draftSelected.includes(g.id)}
                    onChange={() =>
                      setDraftSelected((ids) =>
                        ids.includes(g.id)
                          ? ids.filter((id) => id !== g.id)
                          : [...ids, g.id],
                      )
                    }
                  />
                  {g.image && (
                    <div className="size-12 shrink-0 overflow-hidden rounded border">
                      <img
                        src={g.image}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-neutral-500">
                      {g.category} ·{" "}
                      {g.price > 0 ? `$${g.price.toFixed(2)}` : "Price needed"}{" "}
                      ·{" "}
                      {g.stockUnconfirmed
                        ? "Stock unconfirmed"
                        : g.stock > 0
                          ? `Stock ${g.stock}`
                          : "Out of stock"}
                    </p>
                  </div>
                  <Link
                    className="text-sm underline"
                    href={`/admin/products/edit/${g.id}`}
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        )}
        <button
          className={primary}
          disabled={busy || !selectedReady}
          onClick={() => void publish()}
        >
          Publish selected ({draftSelected.length})
        </button>
        {draftSelected.length > 0 && !selectedReady && (
          <p className="text-xs text-amber-700">
            Selected drafts need a positive price, verified positive stock and
            an image before publishing.
          </p>
        )}
      </section>
    </div>
  );
}
