import { Prisma } from "@prisma/client";

export const skuSelect = Prisma.validator<Prisma.SKUSelect>()({
  id: true,
  image: true,
  price: true,
  stock: true,
  value: true,
});
