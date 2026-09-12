import { OrderStatus } from "@prisma/client";

import { OrderService } from "../order.service";

export const ORDER_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "22222222-2222-4222-8222-222222222222";
export const CART_ITEM_ID = "33333333-3333-4333-8333-333333333333";

/**
 * Test doubles for every collaborator OrderController depends on.
 * Only the methods OrderController actually calls are stubbed.
 */
export const createOrderControllerMocks = () => ({
  orderService: {
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    checkout: jest.fn(),
    cancelOrder: jest.fn(),
  },
});

export type OrderControllerMocks = ReturnType<
  typeof createOrderControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test (bypasses the DI container). */
export const setupOrderController = async () => {
  const mocks = createOrderControllerMocks();
  const { OrderController } = await import("../order.controller");
  const controller = new OrderController(
    mocks.orderService as unknown as OrderService,
  );

  return { mocks, controller };
};

/** An order response as the service returns it. */
export const makeOrderResponse = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: ACTIVE_USER_ID,
  status: OrderStatus.PENDING_CONFIRMATION,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  items: [],
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
