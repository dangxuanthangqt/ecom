import { NOT_DELETED } from "@/constants/soft-delete.constant";
import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { languageSelect } from "./language.selector";

const brandTranslationSelect = defineSelect<Prisma.BrandTranslationSelect>()({
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
