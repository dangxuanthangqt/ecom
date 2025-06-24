import { Prisma } from "@prisma/client";

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
      where: {
        deletedAt: null, // If parent brand is deleted, this translation will not be returned
      },
    },
    language: {
      select: languageSelect,
    },
  });

export { brandTranslationSelect };
