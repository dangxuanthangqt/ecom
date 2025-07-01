import { Prisma } from "@prisma/client";

import { languageSelect } from "./language.selector";

export const baseProductTranslationSelect =
  Prisma.validator<Prisma.ProductTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    language: {
      select: languageSelect,
    },
  });
