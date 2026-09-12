import { Test } from "@nestjs/testing";

import { OrderCancelRepository } from "@/repositories/order/order-cancel.repository";
import { OrderCheckoutRepository } from "@/repositories/order/order-checkout.repository";
import { OrderRepository } from "@/repositories/order/order.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export const ORDER_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";
export const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
export const CART_ITEM_ID_1 = "33333333-3333-4333-8333-333333333333";
export const CART_ITEM_ID_2 = "44444444-4444-4444-8444-444444444444";
export const SKU_ID_1 = "55555555-5555-4555-8555-555555555555";
export const SKU_ID_2 = "66666666-6666-4666-8666-666666666666";
export const PRODUCT_ID_1 = "77777777-7777-4777-8777-777777777777";
export const PRODUCT_ID_2 = "88888888-8888-4888-8888-888888888888";
export const SELLER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SELLER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * A bare object standing in for Prisma's interactive-transaction client
 * (`tx`). Only the delegate methods the checkout/cancel flows call are
 * stubbed — same convention as `cart-repository-test-harness.ts`.
 */
export const createTxMocks = () => ({
  cartItem: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  sKU: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  order: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  productSKUSnapshot: {
    findMany: jest.fn(),
  },
});

export type TxMocks = ReturnType<typeof createTxMocks>;

/**
 * Test doubles for `OrderCheckoutRepository`'s only real dependency,
 * `PrismaService`. `$transaction` is wired to immediately invoke the
 * caller's callback with `txMocks`, mirroring how Prisma runs an
 * interactive transaction, so assertions can inspect calls made against
 * `tx` directly.
 */
export const createOrderCheckoutMocks = () => {
  const txMocks = createTxMocks();

  return {
    txMocks,
    prismaService: {
      $transaction: jest.fn(
        async (callback: (tx: TxMocks) => Promise<unknown>) =>
          callback(txMocks),
      ),
    },
  };
};

export type OrderCheckoutMocks = ReturnType<typeof createOrderCheckoutMocks>;

export const buildOrderCheckoutRepository = async (
  mocks: OrderCheckoutMocks,
): Promise<OrderCheckoutRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderCheckoutRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<OrderCheckoutRepository>(OrderCheckoutRepository);
};

export const setupOrderCheckoutRepository = async () => {
  const mocks = createOrderCheckoutMocks();
  const repository = await buildOrderCheckoutRepository(mocks);

  return { mocks, repository };
};

/**
 * Same `$transaction`-invokes-callback wiring as
 * `createOrderCheckoutMocks`, for `OrderCancelRepository`'s own transaction.
 */
export const createOrderCancelMocks = () => {
  const txMocks = createTxMocks();

  return {
    txMocks,
    prismaService: {
      $transaction: jest.fn(
        async (callback: (tx: TxMocks) => Promise<unknown>) =>
          callback(txMocks),
      ),
    },
  };
};

export type OrderCancelMocks = ReturnType<typeof createOrderCancelMocks>;

export const buildOrderCancelRepository = async (
  mocks: OrderCancelMocks,
): Promise<OrderCancelRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderCancelRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<OrderCancelRepository>(OrderCancelRepository);
};

export const setupOrderCancelRepository = async () => {
  const mocks = createOrderCancelMocks();
  const repository = await buildOrderCancelRepository(mocks);

  return { mocks, repository };
};

/** Test doubles for `OrderRepository`'s `PrismaService` dependency. */
export const createOrderMocks = () => ({
  prismaService: {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type OrderMocks = ReturnType<typeof createOrderMocks>;

export const buildOrderRepository = async (
  mocks: OrderMocks,
): Promise<OrderRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<OrderRepository>(OrderRepository);
};

export const setupOrderRepository = async () => {
  const mocks = createOrderMocks();
  const repository = await buildOrderRepository(mocks);

  return { mocks, repository };
};

/** A checkout cart-item row as `tx.cartItem.findMany` would return it. */
export const makeCheckoutRow = (overrides: Record<string, unknown> = {}) => ({
  id: CART_ITEM_ID_1,
  quantity: 2,
  sku: {
    id: SKU_ID_1,
    value: "M",
    price: 19.99,
    stock: 10,
    deletedAt: null,
    product: {
      id: PRODUCT_ID_1,
      name: "Test Product",
      images: ["https://example.com/p.png"],
      publishedAt: new Date("2026-01-01"),
      deletedAt: null,
      createdById: SELLER_A,
    },
  },
  ...overrides,
});

/** A persisted order row, selector-shaped (`createOrderDetailSelect`). */
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

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
