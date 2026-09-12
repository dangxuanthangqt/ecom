import { Prisma } from "@prisma/client";

import { NOT_DELETED } from "@/constants/soft-delete.constant";

import { languageSelect } from "./language.selector";

const brandTranslationSelect =
  Prisma.validator<Prisma.BrandTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    brand: {
      select: {
        id: true,
        name: true,
        logo: true,
      },
      // If the parent brand is deleted, this translation won't be returned.
      where: NOT_DELETED,
    },
    language: {
      select: languageSelect,
    },
  });

export { brandTranslationSelect };
