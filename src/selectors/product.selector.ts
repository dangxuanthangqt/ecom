import { Language as LanguageSchema, Prisma } from "@prisma/client";

import { createBrandWithTranslationsSelect } from "./brand.selector";
import { baseProductTranslationSelect } from "./product-translation.selector";
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
      select: baseProductTranslationSelect,
    },
    skus: {
      where: { deletedAt: null },
      select: skuSelect,
    },
  });
};
