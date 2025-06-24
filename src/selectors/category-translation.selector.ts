import { Prisma } from "@prisma/client";

import { languageSelect } from "./language.selector";

export const categoryTranslationSelect =
  Prisma.validator<Prisma.CategoryTranslationSelect>()({
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
      where: {
        deletedAt: null, // If parent category is deleted, this translation will not be returned
      },
    },
  });
