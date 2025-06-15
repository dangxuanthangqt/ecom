import { Prisma } from "@prisma/client";

import { brandSelect } from "./brand.selector";
import { languageSelect } from "./language.selector";

export const brandTranslationSelect =
  Prisma.validator<Prisma.BrandTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    brand: {
      select: brandSelect,
    },
    language: {
      select: languageSelect,
    },
  });
