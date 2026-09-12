import { Prisma } from "@prisma/client";

import { ALL_LANGUAGES } from "@/constants/language";
import { NOT_DELETED } from "@/constants/soft-delete.constant";

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
        ...NOT_DELETED,
        languageId: languageId === ALL_LANGUAGES ? undefined : languageId,
      },
      select: brandTranslationSelect,
    },
  });

export { brandSelect, createBrandWithTranslationsSelect };
