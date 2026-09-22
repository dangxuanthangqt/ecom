import { ALL_LANGUAGES } from "@/constants/language";
import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { brandTranslationSelect } from "./brand-translation.selector";

const brandSelect = defineSelect<Prisma.BrandSelect>()({
  id: true,
  name: true,
  logo: true,
});

const createBrandWithTranslationsSelect = ({
  languageId = ALL_LANGUAGES,
}: {
  languageId?: string;
} = {}) =>
  defineSelect<Prisma.BrandSelect>()({
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
