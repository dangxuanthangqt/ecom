import { Test } from "@nestjs/testing";

import { OrderStatusRepository } from "@/repositories/order/order-status.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export { ORDER_ID, USER_ID, makeOrder } from "./order-repository-test-harness";

/** Test doubles for `OrderStatusRepository`'s `PrismaService` dependency. */
export const createOrderStatusMocks = () => ({
  prismaService: {
    order: {
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  },
});

export type OrderStatusMocks = ReturnType<typeof createOrderStatusMocks>;

export const buildOrderStatusRepository = async (
  mocks: OrderStatusMocks,
): Promise<OrderStatusRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderStatusRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<OrderStatusRepository>(OrderStatusRepository);
};

export const setupOrderStatusRepository = async () => {
  const mocks = createOrderStatusMocks();
  const repository = await buildOrderStatusRepository(mocks);

  return { mocks, repository };
};
