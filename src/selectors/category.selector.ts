import { Prisma } from "@prisma/client";

import { categoryTranslationSelect } from "./category-translation.selector";

import { ALL_LANGUAGES } from "@/constants/language";

export const categorySelect = Prisma.validator<Prisma.CategorySelect>()({
  id: true,
  name: true,
  logo: true,
});

export const createCategoryWithTranslationsSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: string;
} = {}) =>
  Prisma.validator<Prisma.CategorySelect>()({
    ...categorySelect,
    categoryTranslations: {
      where: {
        deletedAt: null,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: categoryTranslationSelect,
    },
    childrenCategories: {
      where: {
        deletedAt: null, // If category is deleted, this translation will not be returned
      },
      select: categorySelect,
    },
    parentCategory: {
      where: {
        deletedAt: null, // If parent category is deleted, this translation will not be returned
      },
      select: categorySelect,
    },
  });
