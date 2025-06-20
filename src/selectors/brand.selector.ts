import { Prisma } from "@prisma/client";

import { ALL_LANGUAGES } from "@/constants/language";

export const brandSelect = Prisma.validator<Prisma.BrandSelect>()({
  id: true,
  name: true,
  logo: true,
});

export const brandWithTranslationsSelect = ({
  languageId,
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
      select: {
        id: true,
        name: true,
        description: true,
        language: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  });
