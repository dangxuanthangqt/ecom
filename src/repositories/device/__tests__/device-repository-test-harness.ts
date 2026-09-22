import { Test } from "@nestjs/testing";

import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/shared/services/prisma.service";

import { DeviceRepository } from "../device.repository";

export const createDeviceRepositoryMocks = () => ({
  prismaService: {
    device: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
});

export type DeviceRepositoryMocks = ReturnType<
  typeof createDeviceRepositoryMocks
>;

export const buildDeviceRepository = async (
  mocks: DeviceRepositoryMocks,
): Promise<DeviceRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      DeviceRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<DeviceRepository>(DeviceRepository);
};

export const setupDeviceRepository = async () => {
  const mocks = createDeviceRepositoryMocks();
  const repository = await buildDeviceRepository(mocks);

  return { mocks, repository };
};

export const DEVICE_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";

export const makeDevice = (overrides: Record<string, unknown> = {}) => ({
  id: DEVICE_ID,
  userId: USER_ID,
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;

export const createPrismaUniqueError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  });

export const createPrismaNotFoundError = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "5.0.0",
  });

export const createPrismaForeignKeyError = () =>
  new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
    code: "P2003",
    clientVersion: "5.0.0",
  });
