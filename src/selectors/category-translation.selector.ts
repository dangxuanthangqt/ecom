import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { languageSelect } from "./language.selector";

export const categoryTranslationSelect =
  defineSelect<Prisma.CategoryTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    language: {
      select: languageSelect,
    },
    category: {
      // select: categorySelect, Not use this, because it will cause circular dependency
      select: {
        id: true,
        name: true,
        logo: true,
      },
      // If the parent category is deleted, this translation won't be returned.
      where: NOT_DELETED,
    },
  });
