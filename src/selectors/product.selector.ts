import { ALL_LANGUAGES } from "@/constants/language";
import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Language as LanguageSchema, Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { createBrandWithTranslationsSelect } from "./brand.selector";
import { categorySelect } from "./category.selector";
import { productTranslationSelect } from "./product-translation.selector";
import { skuSelect } from "./sku.selector";

export const productSelect = defineSelect<Prisma.ProductSelect>()({
  id: true,
  name: true,
  images: true,
  basePrice: true,
  virtualPrice: true,
  publishedAt: true,
  variants: true,
  brand: {
    select: createBrandWithTranslationsSelect(),
    where: NOT_DELETED,
  },
});

/**
 * List/pagination shape — matches `ProductResponseDto` (no `skus`/`categories`).
 * Use for any `findMany` product query.
 */
export const createProductListSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: LanguageSchema["id"];
} = {}) =>
  defineSelect<Prisma.ProductSelect>()({
    ...productSelect,
    productTranslations: {
      where: {
        ...NOT_DELETED,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: productTranslationSelect,
    },
  });

/**
 * Detail shape — adds `skus`/`categories`, matches `ProductDetailResponseDto`.
 * Use for `findUnique`/create/update product queries.
 *
 * @example
 * ```typescript
 * // Get product with all language translations
 * const selectAll = createProductDetailSelect();
 *
 * // Get product with specific language translations
 * const selectEnglish = createProductDetailSelect({ languageId: 'en' });
 * ```
 */
export const createProductDetailSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: LanguageSchema["id"];
} = {}) =>
  defineSelect<Prisma.ProductSelect>()({
    ...createProductListSelect({ languageId }),
    skus: {
      where: NOT_DELETED,
      select: skuSelect,
      orderBy: { order: "asc" },
    },
    categories: {
      where: NOT_DELETED,
      select: categorySelect,
    },
  });
