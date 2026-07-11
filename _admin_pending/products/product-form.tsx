type CategoryOption = {
  id: string;
  name: string;
};

type ProductForForm = {
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  price: unknown;
  salePrice: unknown | null;
  sku: string | null;
  stock: number;
  sizes: string[];
  colors: string[];
  tags: string[];
  weight: number | null;
  material: string | null;
  status: string;
  featured: boolean;
  newArrival: boolean;
  homepageOrder: number | null;
  categoryId: string | null;
  media: Array<{
    url: string;
    kind: string;
  }>;
};

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryOption[];
  product?: ProductForForm | null;
  submitLabel: string;
};

const statuses = ["DRAFT", "ACTIVE", "ARCHIVED", "HIDDEN"];

function fieldValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function mediaUrl(product: ProductForForm | null | undefined, kind: string) {
  return product?.media.find((item) => item.kind === kind)?.url ?? "";
}

export function ProductForm({ action, categories, product, submitLabel }: ProductFormProps) {
  return (
    <form action={action} className="space-y-8">
      <section className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="name">
            Product name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="auto-generated from name"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="sku">
            SKU
          </label>
          <input
            id="sku"
            name="sku"
            defaultValue={product?.sku ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="brand">
            Brand
          </label>
          <input
            id="brand"
            name="brand"
            defaultValue={product?.brand ?? "rep.things"}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="mt-2 w-full border border-black/15 bg-white px-3 py-2 outline-none focus:border-black"
          >
            <option value="">Unassigned</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="shortDescription">
            Short description
          </label>
          <input
            id="shortDescription"
            name="shortDescription"
            defaultValue={product?.shortDescription ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={product?.status ?? "DRAFT"}
            className="mt-2 w-full border border-black/15 bg-white px-3 py-2 outline-none focus:border-black"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="longDescription">
            Long description
          </label>
          <textarea
            id="longDescription"
            name="longDescription"
            rows={5}
            defaultValue={product?.longDescription ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>
      </section>

      <section className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium" htmlFor="price">
            Price
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={fieldValue(product?.price)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="salePrice">
            Sale price
          </label>
          <input
            id="salePrice"
            name="salePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fieldValue(product?.salePrice)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            defaultValue={product?.stock ?? 0}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="sizes">
            Sizes
          </label>
          <input
            id="sizes"
            name="sizes"
            defaultValue={product?.sizes.join(", ") ?? ""}
            placeholder="XS, S, M, L"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="colors">
            Colors
          </label>
          <input
            id="colors"
            name="colors"
            defaultValue={product?.colors.join(", ") ?? ""}
            placeholder="Black, Ivory"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={product?.tags.join(", ") ?? ""}
            placeholder="minimal, everyday"
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="material">
            Material
          </label>
          <input
            id="material"
            name="material"
            defaultValue={product?.material ?? ""}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="weight">
            Weight
          </label>
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.01"
            defaultValue={fieldValue(product?.weight)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="homepageOrder">
            Homepage order
          </label>
          <input
            id="homepageOrder"
            name="homepageOrder"
            type="number"
            defaultValue={fieldValue(product?.homepageOrder)}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} />
          Featured
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input name="newArrival" type="checkbox" defaultChecked={product?.newArrival ?? false} />
          New arrival
        </label>
      </section>

      <section className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="itemImageUrl">
            Item image URL
          </label>
          <input
            id="itemImageUrl"
            name="itemImageUrl"
            type="url"
            defaultValue={mediaUrl(product, "ITEM")}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="modelImageUrl">
            Model image URL
          </label>
          <input
            id="modelImageUrl"
            name="modelImageUrl"
            type="url"
            defaultValue={mediaUrl(product, "MODEL")}
            className="mt-2 w-full border border-black/15 px-3 py-2 outline-none focus:border-black"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="bg-black px-5 py-3 text-sm font-semibold text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
