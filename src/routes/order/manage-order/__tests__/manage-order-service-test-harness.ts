import { Test } from "@nestjs/testing";
import { OrderStatus } from "@prisma/client";

import { OrderStatusRepository } from "@/repositories/order/order-status.repository";
import { OrderRepository } from "@/repositories/order/order.repository";

import { ManageOrderService } from "../manage-order.service";

export const ORDER_ID = "11111111-1111-4111-8111-111111111111";
export const SELLER_ID = "22222222-2222-4222-8222-222222222222";
export const OTHER_SELLER_ID = "33333333-3333-4333-8333-333333333333";
export const ADMIN_ID = "44444444-4444-4444-8444-444444444444";

export const SELLER_ROLE = "seller";
export const ADMIN_ROLE = "admin";

/**
 * Test doubles for every collaborator `ManageOrderService` depends on.
 * Only the methods it actually calls are stubbed.
 */
export const createManageOrderServiceMocks = () => ({
  orderRepository: {
    findManyOrders: jest.fn(),
    findUniqueOrder: jest.fn(),
  },
  orderStatusRepository: {
    updateOrderStatus: jest.fn(),
  },
});

export type ManageOrderServiceMocks = ReturnType<
  typeof createManageOrderServiceMocks
>;

export const buildManageOrderService = async (
  mocks: ManageOrderServiceMocks,
): Promise<ManageOrderService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ManageOrderService,
      { provide: OrderRepository, useValue: mocks.orderRepository },
      {
        provide: OrderStatusRepository,
        useValue: mocks.orderStatusRepository,
      },
    ],
  }).compile();

  return moduleRef.get<ManageOrderService>(ManageOrderService);
};

export const setupManageOrderService = async () => {
  const mocks = createManageOrderServiceMocks();
  const service = await buildManageOrderService(mocks);

  return { mocks, service };
};

/** A persisted order as `OrderRepository.findUniqueOrder` returns it. */
export const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: "buyer-1",
  status: OrderStatus.PENDING_CONFIRMATION,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  items: [],
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
