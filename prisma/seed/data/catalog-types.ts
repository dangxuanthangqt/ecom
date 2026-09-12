import { skuId } from "../seed-ids";

export const image = (slug: string): string =>
  `https://picsum.photos/seed/${slug}/600/600`;

export interface TranslationFixture {
  languageId: string;
  name: string;
  description: string;
}

export interface BrandFixture {
  id: string;
  name: string;
  logo: string;
  translations: TranslationFixture[];
}

export interface CategoryFixture {
  id: string;
  name: string;
  logo: string | null;
  parentCategoryId: string | null;
  translations: TranslationFixture[];
}

export interface SkuFixture {
  id: string;
  value: string;
  price: number;
  stock: number;
  image: string;
  order: number;
}

export interface ProductFixture {
  id: string;
  name: string;
  basePrice: number;
  virtualPrice: number;
  brandId: string;
  categoryIds: string[];
  images: string[];
  publishedAt: Date | null;
  variants: VariantFixture[];
  translations: TranslationFixture[];
  skus: SkuFixture[];
}

export interface VariantFixture {
  value: string;
  options: string[];
}

/**
 * Cartesian product of the variant options — mirrors how the API builds SKUs.
 * Prices and stock step deterministically so no two SKUs of a product collide
 * and the numbers stay identical across machines.
 */
export const buildSkus = (
  productIndex: number,
  variants: VariantFixture[],
  basePrice: number,
  imageSlug: string,
): SkuFixture[] => {
  const combinations = variants.reduce<string[][]>(
    (acc, variant) =>
      acc.flatMap((prefix) =>
        variant.options.map((option) => [...prefix, option]),
      ),
    [[]],
  );

  return combinations.map((combination, index) => ({
    id: skuId(productIndex, index + 1),
    value: combination.join("-"),
    price: Math.round(basePrice * (1 + index * 0.08)),
    stock: 60 - index * 5,
    image: image(`${imageSlug}-${index + 1}`),
    order: index,
  }));
};
