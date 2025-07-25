import { Prisma } from "@prisma/client";

import { ALL_LANGUAGES } from "@/constants/language";

import { brandTranslationSelect } from "./brand-translation.selector";

const brandSelect = Prisma.validator<Prisma.BrandSelect>()({
  id: true,
  name: true,
  logo: true,
});

const createBrandWithTranslationsSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: string;
} = {}) =>
  Prisma.validator<Prisma.BrandSelect>()({
    ...brandSelect,
    brandTranslations: {
      where: {
        deletedAt: null,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: brandTranslationSelect,
    },
  });

export { brandSelect, createBrandWithTranslationsSelect };
