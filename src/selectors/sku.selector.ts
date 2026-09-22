import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

export const skuSelect = defineSelect<Prisma.SKUSelect>()({
  id: true,
  order: true,
  image: true,
  price: true,
  stock: true,
  value: true,
});
