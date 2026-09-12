import type { ManageOrderService } from "../manage-order.service";

/**
 * Test doubles for every collaborator `ManageOrderController` depends on.
 * Only the methods it actually calls are stubbed.
 */
export const createManageOrderControllerMocks = () => ({
  manageOrderService: {
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
  },
});

export type ManageOrderControllerMocks = ReturnType<
  typeof createManageOrderControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupManageOrderController = async () => {
  const mocks = createManageOrderControllerMocks();
  const { ManageOrderController } = await import("../manage-order.controller");
  const controller = new ManageOrderController(
    mocks.manageOrderService as unknown as ManageOrderService,
  );

  return { mocks, controller };
};

export const ORDER_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "22222222-2222-4222-8222-222222222222";
export const SELLER_ROLE_NAME = "seller";
export const ADMIN_ROLE_NAME = "admin";

/** An order response as the service returns it. */
export const makeOrderResponse = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  status: "PENDING_CONFIRMATION",
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  items: [],
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
