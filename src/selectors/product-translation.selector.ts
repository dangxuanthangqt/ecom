import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { languageSelect } from "./language.selector";

export const productTranslationSelect =
  defineSelect<Prisma.ProductTranslationSelect>()({
    id: true,
    name: true,
    description: true,
    language: {
      select: languageSelect,
    },
  });
