import { OrderStatus } from "@/generated/prisma/client";

/**
 * Single source of truth for legal `OrderStatus` transitions (BR-O05).
 *
 * Buyer-vs-seller authority is NOT encoded here — the actor check (buyer may
 * only pick CANCELLED, seller/admin may not pick CANCELLED) lives in the
 * services that call `canTransition`.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = Object.freeze({
  [OrderStatus.PENDING_CONFIRMATION]: Object.freeze([
    OrderStatus.PENDING_PICKUP,
    OrderStatus.CANCELLED,
  ]),
  [OrderStatus.PENDING_PICKUP]: Object.freeze([OrderStatus.PENDING_DELIVERY]),
  [OrderStatus.PENDING_DELIVERY]: Object.freeze([OrderStatus.DELIVERED]),
  [OrderStatus.DELIVERED]: Object.freeze([OrderStatus.RETURNED]),
  [OrderStatus.RETURNED]: Object.freeze([]),
  [OrderStatus.CANCELLED]: Object.freeze([]),
});

export interface CanTransitionParams {
  from: OrderStatus;
  to: OrderStatus;
}

/**
 * Pure function over the frozen `ORDER_STATUS_TRANSITIONS` map — returns
 * whether moving an order from `from` to `to` is a legal status transition.
 */
export function canTransition({ from, to }: CanTransitionParams): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
