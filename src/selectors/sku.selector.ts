import { Prisma } from "@prisma/client";

export const skuSelect = Prisma.validator<Prisma.SKUSelect>()({
  id: true,
  order: true,
  image: true,
  price: true,
  stock: true,
  value: true,
});
