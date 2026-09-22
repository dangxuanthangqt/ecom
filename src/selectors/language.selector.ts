import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

export const languageSelect = defineSelect<Prisma.LanguageSelect>()({
  id: true,
  name: true,
});
