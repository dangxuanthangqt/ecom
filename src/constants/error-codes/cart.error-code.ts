/**
 * Cart failures. Stock conditions are the interesting ones: a client should
 * refetch the cart rather than only toast, because the numbers on screen are
 * already stale by the time it reads this.
 */
export const CartErrorCode = {
  CART_ITEM_NOT_FOUND: "CART_ITEM_NOT_FOUND",
  /** Asked for more than the SKU has. The message carries the figure. */
  CART_ITEM_INSUFFICIENT_STOCK: "CART_ITEM_INSUFFICIENT_STOCK",
  /** Two writes raced on the same row; the client may retry as-is. */
  CART_UPDATE_CONFLICT: "CART_UPDATE_CONFLICT",
} as const;
