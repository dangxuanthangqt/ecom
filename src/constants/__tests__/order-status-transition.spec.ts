import { OrderStatus } from "@/generated/prisma/client";

import { canTransition } from "../order-status.constant";

describe("canTransition", () => {
  it.each([
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.PENDING_PICKUP],
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_PICKUP, OrderStatus.PENDING_DELIVERY],
    [OrderStatus.PENDING_DELIVERY, OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  ])("allows the legal transition %s -> %s", (from, to) => {
    expect(canTransition({ from, to })).toBe(true);
  });

  it.each([
    // Backwards
    [OrderStatus.PENDING_PICKUP, OrderStatus.PENDING_CONFIRMATION],
    [OrderStatus.DELIVERED, OrderStatus.PENDING_DELIVERY],
    // Skipping ahead
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.PENDING_DELIVERY],
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.DELIVERED],
    [OrderStatus.PENDING_PICKUP, OrderStatus.DELIVERED],
    // Cancelling after the cancellable window
    [OrderStatus.PENDING_PICKUP, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_DELIVERY, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    // Out of terminal states
    [OrderStatus.DELIVERED, OrderStatus.PENDING_CONFIRMATION],
    [OrderStatus.CANCELLED, OrderStatus.PENDING_CONFIRMATION],
    [OrderStatus.RETURNED, OrderStatus.PENDING_CONFIRMATION],
    [OrderStatus.RETURNED, OrderStatus.DELIVERED],
    [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
  ])("rejects the illegal transition %s -> %s", (from, to) => {
    expect(canTransition({ from, to })).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(
      canTransition({
        from: OrderStatus.PENDING_CONFIRMATION,
        to: OrderStatus.PENDING_CONFIRMATION,
      }),
    ).toBe(false);
  });
});
