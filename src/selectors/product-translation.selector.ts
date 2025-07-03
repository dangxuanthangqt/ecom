import { Prisma } from "@prisma/client";

import { languageSelect } from "./language.selector";

export const productTranslationSelect =
  Prisma.validator<Prisma.ProductTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    language: {
      select: languageSelect,
    },
  });
