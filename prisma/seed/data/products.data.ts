import { BrandId, CategoryId, catalogProductId, ProductId } from "../seed-ids";

import {
  buildSkus,
  image,
  ProductFixture,
  VariantFixture,
} from "./catalog-types";

/** Reusable variant shapes, so 30 products do not repeat the same option lists. */
const V = {
  colorStorage: [
    { value: "Color", options: ["Black", "Blue"] },
    { value: "Storage", options: ["128GB", "256GB"] },
  ],
  storage: [{ value: "Storage", options: ["256GB", "512GB"] }],
  color: [{ value: "Color", options: ["Gray", "Violet"] }],
  shoeSize: [{ value: "Size", options: ["40", "41", "42"] }],
  clothingSize: [{ value: "Size", options: ["S", "M", "L"] }],
  single: [{ value: "Type", options: ["Standard"] }],
} satisfies Record<string, VariantFixture[]>;

interface CatalogEntry {
  name: string;
  brandId: string;
  categoryIds: string[];
  basePrice: number;
  variants: VariantFixture[];
}

const slug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Bulk catalogue. Deliberately terse: every field that can be derived (ids,
 * images, translations, SKUs, virtual price) is derived, so adding a product is
 * one line and stays deterministic.
 */
const CATALOG: CatalogEntry[] = [
  {
    name: "iPhone 15 Pro",
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 27_000_000,
    variants: V.colorStorage,
  },
  {
    name: "iPhone SE",
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 11_000_000,
    variants: V.storage,
  },
  {
    name: "iPad Air",
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS],
    basePrice: 16_000_000,
    variants: V.storage,
  },
  {
    name: "MacBook Pro 14",
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.LAPTOPS],
    basePrice: 45_000_000,
    variants: V.storage,
  },
  {
    name: "AirPods Pro",
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.AUDIO],
    basePrice: 6_000_000,
    variants: V.single,
  },
  {
    name: "Galaxy S24 Ultra",
    brandId: BrandId.SAMSUNG,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 30_000_000,
    variants: V.colorStorage,
  },
  {
    name: "Galaxy A55",
    brandId: BrandId.SAMSUNG,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 9_500_000,
    variants: V.color,
  },
  {
    name: "Galaxy Book4",
    brandId: BrandId.SAMSUNG,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.LAPTOPS],
    basePrice: 22_000_000,
    variants: V.storage,
  },
  {
    name: "Galaxy Buds3",
    brandId: BrandId.SAMSUNG,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.AUDIO],
    basePrice: 3_500_000,
    variants: V.color,
  },
  {
    name: "Xiaomi 14",
    brandId: BrandId.XIAOMI,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 17_000_000,
    variants: V.colorStorage,
  },
  {
    name: "Redmi Note 13",
    brandId: BrandId.XIAOMI,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    basePrice: 5_500_000,
    variants: V.color,
  },
  {
    name: "Xiaomi Air Fryer",
    brandId: BrandId.XIAOMI,
    categoryIds: [CategoryId.HOME, CategoryId.KITCHEN],
    basePrice: 2_200_000,
    variants: V.single,
  },
  {
    name: "Xiaomi Robot Vacuum",
    brandId: BrandId.XIAOMI,
    categoryIds: [CategoryId.HOME],
    basePrice: 8_900_000,
    variants: V.single,
  },
  {
    name: "Sony WH-1000XM5",
    brandId: BrandId.SONY,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.AUDIO],
    basePrice: 8_500_000,
    variants: V.color,
  },
  {
    name: "Sony WF-1000XM5",
    brandId: BrandId.SONY,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.AUDIO],
    basePrice: 6_200_000,
    variants: V.color,
  },
  {
    name: "Sony SRS-XB100",
    brandId: BrandId.SONY,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.AUDIO],
    basePrice: 1_400_000,
    variants: V.single,
  },
  {
    name: "Sony Alpha A7 IV",
    brandId: BrandId.SONY,
    categoryIds: [CategoryId.ELECTRONICS],
    basePrice: 58_000_000,
    variants: V.single,
  },
  {
    name: "Nike Pegasus 41",
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION, CategoryId.SHOES],
    basePrice: 3_600_000,
    variants: V.shoeSize,
  },
  {
    name: "Nike Dunk Low",
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION, CategoryId.SHOES],
    basePrice: 2_900_000,
    variants: V.shoeSize,
  },
  {
    name: "Nike Dri-FIT Tee",
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION, CategoryId.CLOTHING],
    basePrice: 850_000,
    variants: V.clothingSize,
  },
  {
    name: "Nike Windrunner Jacket",
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION, CategoryId.CLOTHING],
    basePrice: 2_400_000,
    variants: V.clothingSize,
  },
  {
    name: "Adidas Ultraboost 5",
    brandId: BrandId.ADIDAS,
    categoryIds: [CategoryId.FASHION, CategoryId.SHOES],
    basePrice: 4_500_000,
    variants: V.shoeSize,
  },
  {
    name: "Adidas Samba OG",
    brandId: BrandId.ADIDAS,
    categoryIds: [CategoryId.FASHION, CategoryId.SHOES],
    basePrice: 2_700_000,
    variants: V.shoeSize,
  },
  {
    name: "Adidas Tiro Track Pants",
    brandId: BrandId.ADIDAS,
    categoryIds: [CategoryId.FASHION, CategoryId.CLOTHING],
    basePrice: 1_300_000,
    variants: V.clothingSize,
  },
  {
    name: "Adidas Essentials Hoodie",
    brandId: BrandId.ADIDAS,
    categoryIds: [CategoryId.FASHION, CategoryId.CLOTHING],
    basePrice: 1_800_000,
    variants: V.clothingSize,
  },
];

/** Catalogue entries start at index 100 to stay clear of the hero product ids. */
const CATALOG_INDEX_OFFSET = 100;

const toFixture = (entry: CatalogEntry, offset: number): ProductFixture => {
  const index = CATALOG_INDEX_OFFSET + offset;
  const imageSlug = slug(entry.name);

  return {
    id: catalogProductId(index),
    name: entry.name,
    basePrice: entry.basePrice,
    virtualPrice: Math.round(entry.basePrice * 1.15),
    brandId: entry.brandId,
    categoryIds: entry.categoryIds,
    images: [image(`${imageSlug}-a`), image(`${imageSlug}-b`)],
    // Staggered by one day each so `orderBy: createdAt/publishedAt` pagination
    // has a stable, non-tied ordering to page through.
    publishedAt: new Date(Date.UTC(2026, 0, 1 + offset)),
    variants: entry.variants,
    translations: [
      {
        languageId: "en",
        name: entry.name,
        description: `${entry.name} — sample catalogue item.`,
      },
      {
        languageId: "vi",
        name: entry.name,
        description: `${entry.name} — sản phẩm mẫu.`,
      },
    ],
    skus: buildSkus(index, entry.variants, entry.basePrice, imageSlug),
  };
};

const heroVariants = {
  iphone: V.colorStorage,
  macbook: V.storage,
  galaxy: V.color,
  airMax: V.shoeSize,
  draft: [{ value: "Color", options: ["White"] }] satisfies VariantFixture[],
};

/**
 * Hero products keep named ids because the cart, order and review fixtures point
 * at them. Never renumber or remove one without updating those seeders.
 */
const HEROES: ProductFixture[] = [
  {
    id: ProductId.IPHONE_15,
    name: "iPhone 15",
    basePrice: 20_000_000,
    virtualPrice: 22_000_000,
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    images: [image("iphone-15-a"), image("iphone-15-b")],
    publishedAt: new Date("2026-01-10T00:00:00Z"),
    variants: heroVariants.iphone,
    translations: [
      {
        languageId: "en",
        name: "iPhone 15",
        description: "Apple flagship smartphone.",
      },
      {
        languageId: "vi",
        name: "iPhone 15",
        description: "Điện thoại cao cấp của Apple.",
      },
    ],
    skus: buildSkus(1, heroVariants.iphone, 20_000_000, "iphone-15"),
  },
  {
    id: ProductId.MACBOOK_AIR,
    name: "MacBook Air M3",
    basePrice: 28_000_000,
    virtualPrice: 31_000_000,
    brandId: BrandId.APPLE,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.LAPTOPS],
    images: [image("macbook-air-a")],
    publishedAt: new Date("2026-02-01T00:00:00Z"),
    variants: heroVariants.macbook,
    translations: [
      {
        languageId: "en",
        name: "MacBook Air M3",
        description: "Thin and light laptop.",
      },
      {
        languageId: "vi",
        name: "MacBook Air M3",
        description: "Laptop mỏng nhẹ.",
      },
    ],
    skus: buildSkus(2, heroVariants.macbook, 28_000_000, "macbook-air"),
  },
  {
    id: ProductId.GALAXY_S24,
    name: "Galaxy S24",
    basePrice: 18_000_000,
    virtualPrice: 19_500_000,
    brandId: BrandId.SAMSUNG,
    categoryIds: [CategoryId.ELECTRONICS, CategoryId.PHONES],
    images: [image("galaxy-s24-a")],
    publishedAt: new Date("2026-01-20T00:00:00Z"),
    variants: heroVariants.galaxy,
    translations: [
      {
        languageId: "en",
        name: "Galaxy S24",
        description: "Samsung flagship smartphone.",
      },
      {
        languageId: "vi",
        name: "Galaxy S24",
        description: "Điện thoại cao cấp của Samsung.",
      },
    ],
    skus: buildSkus(3, heroVariants.galaxy, 18_000_000, "galaxy-s24"),
  },
  {
    id: ProductId.AIR_MAX,
    name: "Nike Air Max",
    basePrice: 3_200_000,
    virtualPrice: 3_800_000,
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION, CategoryId.SHOES],
    images: [image("air-max-a")],
    publishedAt: new Date("2026-03-05T00:00:00Z"),
    variants: heroVariants.airMax,
    translations: [
      {
        languageId: "en",
        name: "Nike Air Max",
        description: "Everyday running sneakers.",
      },
      {
        languageId: "vi",
        name: "Nike Air Max",
        description: "Giày chạy bộ hằng ngày.",
      },
    ],
    skus: buildSkus(4, heroVariants.airMax, 3_200_000, "air-max"),
  },
  {
    // Deliberately unpublished: exercises the publishedAt filter on list endpoints.
    id: ProductId.UNPUBLISHED_DRAFT,
    name: "Unpublished Draft Product",
    basePrice: 1_000_000,
    virtualPrice: 1_200_000,
    brandId: BrandId.NIKE,
    categoryIds: [CategoryId.FASHION],
    images: [image("draft-a")],
    publishedAt: null,
    variants: heroVariants.draft,
    translations: [
      {
        languageId: "en",
        name: "Unpublished Draft Product",
        description: "Not visible to clients.",
      },
      {
        languageId: "vi",
        name: "Sản phẩm nháp",
        description: "Chưa hiển thị với khách hàng.",
      },
    ],
    skus: buildSkus(5, heroVariants.draft, 1_000_000, "draft"),
  },
];

export const PRODUCTS: ProductFixture[] = [
  ...HEROES,
  ...CATALOG.map(toFixture),
];

const BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

/** Lookup used by the cart/order/review fixtures, which address products by id. */
export const productById = (id: string): ProductFixture => {
  const product = BY_ID.get(id);

  if (!product) {
    throw new Error(`No product fixture with id "${id}"`);
  }

  return product;
};
