import { Prisma } from "@prisma/client";

export const languageSelect = Prisma.validator<Prisma.LanguageSelect>()({
  id: true,
  name: true,
});
