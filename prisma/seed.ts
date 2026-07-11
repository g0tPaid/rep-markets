import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@rep.things";
const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";

const categories = [
  { name: "TOP", slug: "top", sortOrder: 10 },
  { name: "BOTTOM", slug: "bottom", sortOrder: 20 },
  { name: "JEWELRY", slug: "jewelry", sortOrder: 30 },
  { name: "ACCESSORIES", slug: "accessories", sortOrder: 40 },
  { name: "HEADWEAR", slug: "headwear", sortOrder: 50 },
];

const products = [
  {
    name: "rep.things Boxy Cotton Shirt",
    slug: "boxy-cotton-shirt",
    categorySlug: "top",
    price: "78.00",
    stock: 32,
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Black"],
    material: "Organic cotton poplin",
    itemImageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Ribbed Tank",
    slug: "ribbed-tank",
    categorySlug: "top",
    price: "42.00",
    stock: 46,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Oat", "Black", "Clay"],
    material: "Cotton rib jersey",
    itemImageUrl:
      "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Soft Knit Cardigan",
    slug: "soft-knit-cardigan",
    categorySlug: "top",
    price: "96.00",
    stock: 18,
    sizes: ["S", "M", "L"],
    colors: ["Heather Grey", "Espresso"],
    material: "Cotton cashmere blend",
    itemImageUrl:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Relaxed Utility Trouser",
    slug: "relaxed-utility-trouser",
    categorySlug: "bottom",
    price: "112.00",
    stock: 24,
    sizes: ["24", "26", "28", "30", "32"],
    colors: ["Washed Black", "Khaki"],
    material: "Cotton twill",
    itemImageUrl:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Everyday Wide Denim",
    slug: "everyday-wide-denim",
    categorySlug: "bottom",
    price: "128.00",
    stock: 20,
    sizes: ["24", "26", "28", "30", "32"],
    colors: ["Indigo", "Faded Blue"],
    material: "Rigid cotton denim",
    itemImageUrl:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Column Skirt",
    slug: "column-skirt",
    categorySlug: "bottom",
    price: "88.00",
    stock: 15,
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Sand"],
    material: "Tencel linen blend",
    itemImageUrl:
      "https://images.unsplash.com/photo-1583496661160-fb5886a13d24?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Small Hoop Pair",
    slug: "small-hoop-pair",
    categorySlug: "jewelry",
    price: "54.00",
    stock: 40,
    sizes: ["One size"],
    colors: ["Gold", "Silver"],
    material: "Gold vermeil",
    itemImageUrl:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Canvas Market Tote",
    slug: "canvas-market-tote",
    categorySlug: "accessories",
    price: "68.00",
    stock: 28,
    sizes: ["One size"],
    colors: ["Natural", "Black"],
    material: "Heavy cotton canvas",
    itemImageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "rep.things Cotton Field Cap",
    slug: "cotton-field-cap",
    categorySlug: "headwear",
    price: "48.00",
    stock: 35,
    sizes: ["One size"],
    colors: ["Black", "Olive", "Bone"],
    material: "Washed cotton twill",
    itemImageUrl:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1200&q=80",
    modelImageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "rep.things Admin",
      passwordHash,
      role: "ADMIN",
    },
    create: {
      name: "rep.things Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      siteName: "rep.things",
      metaTitle: "rep.things Fashion Store",
      metaDescription: "Clean, wearable fashion pieces for daily life.",
      currency: "USD",
    },
    create: {
      id: "default",
      siteName: "rep.things",
      metaTitle: "rep.things Fashion Store",
      metaDescription: "Clean, wearable fashion pieces for daily life.",
      currency: "USD",
    },
  });

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isVisible: true,
      },
      create: {
        ...category,
        isVisible: true,
      },
    });
  }

  const categoryRecords = await prisma.category.findMany({
    where: { slug: { in: categories.map((category) => category.slug) } },
  });
  const categoryBySlug = new Map(categoryRecords.map((category) => [category.slug, category]));

  for (const [index, product] of products.entries()) {
    const category = categoryBySlug.get(product.categorySlug);

    if (!category) {
      continue;
    }

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        shortDescription: "A practical wardrobe piece from rep.things.",
        longDescription:
          "Designed for regular wear with simple styling, comfortable materials, and a quiet rep.things finish.",
        brand: "rep.things",
        price: product.price,
        stock: product.stock,
        sizes: product.sizes,
        colors: product.colors,
        tags: ["rep.things", "fashion", product.categorySlug],
        material: product.material,
        status: "ACTIVE",
        featured: index < 4,
        newArrival: index >= 5,
        homepageOrder: index + 1,
        categoryId: category.id,
      },
      create: {
        name: product.name,
        slug: product.slug,
        shortDescription: "A practical wardrobe piece from rep.things.",
        longDescription:
          "Designed for regular wear with simple styling, comfortable materials, and a quiet rep.things finish.",
        brand: "rep.things",
        price: product.price,
        sku: `PT-${String(index + 1).padStart(3, "0")}`,
        stock: product.stock,
        sizes: product.sizes,
        colors: product.colors,
        tags: ["rep.things", "fashion", product.categorySlug],
        material: product.material,
        status: "ACTIVE",
        featured: index < 4,
        newArrival: index >= 5,
        homepageOrder: index + 1,
        categoryId: category.id,
      },
    });

    await prisma.productMedia.deleteMany({
      where: { productId: savedProduct.id },
    });

    await prisma.productMedia.createMany({
      data: [
        {
          productId: savedProduct.id,
          url: product.itemImageUrl,
          kind: "ITEM",
          alt: `${product.name} item image`,
          sortOrder: 0,
        },
        {
          productId: savedProduct.id,
          url: product.modelImageUrl,
          kind: "MODEL",
          alt: `${product.name} model image`,
          sortOrder: 1,
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
