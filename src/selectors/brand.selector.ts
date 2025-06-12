import { Prisma } from "@prisma/client";

export const brandSelect = Prisma.validator<Prisma.BrandSelect>()({
  id: true,
  name: true,
  logo: true,
});

export const brandWithTranslationsSelect =
  Prisma.validator<Prisma.BrandSelect>()({
    ...brandSelect,
    brandTranslations: {
      where: { deletedAt: null },
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
