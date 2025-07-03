import { Language as LanguageSchema, Prisma } from "@prisma/client";

import { createBrandWithTranslationsSelect } from "./brand.selector";
import { categorySelect } from "./category.selector";
import { productTranslationSelect } from "./product-translation.selector";
import { skuSelect } from "./sku.selector";

import { ALL_LANGUAGES } from "@/constants/language";

export const productSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  name: true,
  images: true,
  basePrice: true,
  virtualPrice: true,
  publishAt: true,
  brand: {
    select: createBrandWithTranslationsSelect(),
    where: { deletedAt: null },
  },
  variants: true,
});

/**
 * Creates a Prisma select object for product queries with related data.
 *
 * @param options - Configuration options for the select query
 * @param options.languageId - The language ID to filter product translations.
 *                             Defaults to ALL_LANGUAGES to include all translations.
 * @returns A Prisma ProductSelect object configured with product translations, SKUs, and categories
 *
 * @example
 * ```typescript
 * // Get product with all language translations
 * const selectAll = createProductSelect();
 *
 * // Get product with specific language translations
 * const selectEnglish = createProductSelect({ languageId: 'en' });
 * ```
 */
export const createProductSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: LanguageSchema["id"];
} = {}) => {
  return Prisma.validator<Prisma.ProductSelect>()({
    ...productSelect,
    productTranslations: {
      where: {
        deletedAt: null,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: productTranslationSelect,
    },
    skus: {
      where: { deletedAt: null },
      select: skuSelect,
      orderBy: { order: "asc" },
    },
    categories: {
      where: { deletedAt: null },
      select: categorySelect,
    },
  });
};
