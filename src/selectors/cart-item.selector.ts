import { Prisma } from "@/generated/prisma/client";
import { skuSelect } from "@/selectors/sku.selector";
import { defineSelect } from "@/shared/utils/prisma-select.util";

/**
 * Parent-product fields nested under a cart line's SKU. `publishedAt`,
 * `deletedAt` and `createdById` are not surfaced by this phase's response
 * DTO, but are selected here so phase 03 (checkout groups cart items by
 * `product.createdById`) can reuse this selector without an extra query.
 */
const cartItemProductSummarySelect = defineSelect<Prisma.ProductSelect>()({
  id: true,
  name: true,
  publishedAt: true,
  deletedAt: true,
  createdById: true,
});

export const createCartItemSelect = () =>
  defineSelect<Prisma.CartItemSelect>()({
    id: true,
    quantity: true,
    createdAt: true,
    updatedAt: true,
    sku: {
      select: {
        ...skuSelect,
        product: {
          select: cartItemProductSummarySelect,
        },
      },
    },
  });
