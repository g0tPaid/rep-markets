"use client";

import { useActionState, useState } from "react";
import { quickUpdateProduct } from "@/app/admin/actions/products";

const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"];

export function QuickProductForm({ id, price, stock, sizes, visible, singleQuality }: {
  id: string; price: number; stock: number; sizes: string[]; visible: boolean; singleQuality: boolean;
}) {
  const [state, action, pending] = useActionState(quickUpdateProduct.bind(null, id), {});
  const [selected, setSelected] = useState(sizes.filter((size) => standardSizes.includes(size)));
  const [custom, setCustom] = useState(sizes.filter((size) => !standardSizes.includes(size)).join(", "));
  const [priceValue, setPrice] = useState(String(price));
  const [stockValue, setStock] = useState(String(stock));
  const [visibleValue, setVisible] = useState(visible);
  const [qualityValue, setQuality] = useState(singleQuality);
  const [edited, setEdited] = useState(false);
  const allSizes = [...selected, ...custom.split(",").map((size) => size.trim()).filter(Boolean)];
  return (
    <form action={action} onChange={() => setEdited(true)} onSubmit={() => setEdited(false)} className="space-y-2 border-y border-black/10 py-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-[10px] font-semibold uppercase tracking-wide">Price ($)
          <input name="price" type="number" min="0" max="9999999" step="0.01" required value={priceValue} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full border border-black/20 px-2 py-1.5 text-sm" />
        </label>
        <label className="min-w-0 text-[10px] font-semibold uppercase tracking-wide">Stock
          <input name="stock" type="number" min="0" max="2147483647" step="1" required value={stockValue} onChange={(e) => setStock(e.target.value)} className="mt-1 w-full border border-black/20 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wide">Sizes</legend>
        <div className="flex flex-wrap gap-1">
          {standardSizes.map((size) => <label key={size} className={`cursor-pointer border px-1.5 py-1 text-[10px] ${selected.includes(size) ? "border-black bg-black text-white" : "border-black/20"}`}>
            <input type="checkbox" checked={selected.includes(size)} onChange={() => setSelected((current) => current.includes(size) ? current.filter((s) => s !== size) : standardSizes.filter((s) => current.includes(s) || s === size))} className="sr-only" />{size}
          </label>)}
        </div>
        <input aria-label="Custom sizes" placeholder="Other sizes, comma separated" value={custom} onChange={(e) => setCustom(e.target.value)} className="mt-1 w-full border border-black/20 px-2 py-1.5 text-xs" />
        <input type="hidden" name="sizes" value={allSizes.join(", ")} />
        {!allSizes.length && <p className="mt-1 text-[10px] text-black/50">No size selector (one size)</p>}
      </fieldset>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="singleQuality" checked={qualityValue} onChange={(e) => setQuality(e.target.checked)} /> Single quality (hide options)</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="visible" checked={visibleValue} onChange={(e) => setVisible(e.target.checked)} /> Show on website</label>
      <button disabled={pending} className="w-full bg-black px-2 py-2 text-xs font-semibold text-white disabled:opacity-50" type="submit">{pending ? "Saving…" : "Save product"}</button>
      {!edited && state.success && <p role="status" className="text-xs text-emerald-700">Saved</p>}
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}

