/**
 * Checkout and order-lifecycle failures.
 *
 * The checkout codes fire while the customer is mid-payment, so each one names a
 * condition the client can repair on screen — a sold-out line, a stale quantity —
 * rather than sending them back to the cart with a generic refusal.
 */
export const OrderErrorCode = {
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  /** Cancellation was attempted from a status that does not allow it. */
  ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE",
  /** Someone other than the buyer tried to cancel. */
  ORDER_CANCEL_FORBIDDEN: "ORDER_CANCEL_FORBIDDEN",
  /** The status moved under us between read and write; the client may retry. */
  ORDER_STATUS_CONFLICT: "ORDER_STATUS_CONFLICT",
  /** The requested status is not reachable from the current one. */
  ORDER_STATUS_TRANSITION_INVALID: "ORDER_STATUS_TRANSITION_INVALID",
  /** A cart item named at checkout no longer exists. */
  ORDER_CART_ITEM_NOT_FOUND: "ORDER_CART_ITEM_NOT_FOUND",
  /** The SKU was withdrawn between adding to cart and checking out. */
  SKU_UNAVAILABLE: "SKU_UNAVAILABLE",
  /** The SKU is live but cannot cover the quantity ordered. */
  SKU_INSUFFICIENT_STOCK: "SKU_INSUFFICIENT_STOCK",
} as const;
