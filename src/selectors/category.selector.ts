import { ALL_LANGUAGES } from "@/constants/language";
import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { categoryTranslationSelect } from "./category-translation.selector";

export const categorySelect = defineSelect<Prisma.CategorySelect>()({
  id: true,
  name: true,
  logo: true,
});

export const createCategoryWithTranslationsSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: string;
} = {}) =>
  defineSelect<Prisma.CategorySelect>()({
    ...categorySelect,
    categoryTranslations: {
      where: {
        ...NOT_DELETED,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: categoryTranslationSelect,
    },
    // If the category is deleted, its children/parent won't be returned.
    childrenCategories: {
      where: NOT_DELETED,
      select: categorySelect,
    },
    parentCategory: {
      where: NOT_DELETED,
      select: categorySelect,
    },
  });
