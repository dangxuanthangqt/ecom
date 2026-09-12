import { Test } from "@nestjs/testing";

import { OrderCancelRepository } from "@/repositories/order/order-cancel.repository";
import { OrderCheckoutRepository } from "@/repositories/order/order-checkout.repository";
import { OrderRepository } from "@/repositories/order/order.repository";

import { OrderService } from "../order.service";

export const ORDER_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";
export const CART_ITEM_ID = "33333333-3333-4333-8333-333333333333";

/**
 * Test doubles for every collaborator OrderService depends on.
 * Only the methods OrderService actually calls are stubbed.
 */
export const createOrderServiceMocks = () => ({
  orderRepository: {
    findManyOrders: jest.fn(),
    findUniqueOrder: jest.fn(),
  },
  orderCheckoutRepository: {
    checkout: jest.fn(),
  },
  orderCancelRepository: {
    cancelOrder: jest.fn(),
  },
});

export type OrderServiceMocks = ReturnType<typeof createOrderServiceMocks>;

/** Builds OrderService through the Nest DI container with all deps mocked. */
export const buildOrderService = async (
  mocks: OrderServiceMocks,
): Promise<OrderService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: OrderRepository, useValue: mocks.orderRepository },
      {
        provide: OrderCheckoutRepository,
        useValue: mocks.orderCheckoutRepository,
      },
      { provide: OrderCancelRepository, useValue: mocks.orderCancelRepository },
    ],
  }).compile();

  return moduleRef.get<OrderService>(OrderService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupOrderService = async () => {
  const mocks = createOrderServiceMocks();
  const service = await buildOrderService(mocks);

  return { mocks, service };
};

/** An order as the repository/selector returns it. */
export const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: USER_ID,
  status: "PENDING_CONFIRMATION",
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  items: [],
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
