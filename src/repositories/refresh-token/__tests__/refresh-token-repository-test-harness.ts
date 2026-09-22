import { Test } from "@nestjs/testing";

import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/shared/services/prisma.service";

import { RefreshTokenRepository } from "../refresh-token.repository";

export const createRefreshTokenRepositoryMocks = () => ({
  prismaService: {
    refreshToken: {
      findUniqueOrThrow: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  },
});

export type RefreshTokenRepositoryMocks = ReturnType<
  typeof createRefreshTokenRepositoryMocks
>;

export const buildRefreshTokenRepository = async (
  mocks: RefreshTokenRepositoryMocks,
): Promise<RefreshTokenRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      RefreshTokenRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<RefreshTokenRepository>(RefreshTokenRepository);
};

export const setupRefreshTokenRepository = async () => {
  const mocks = createRefreshTokenRepositoryMocks();
  const repository = await buildRefreshTokenRepository(mocks);

  return { mocks, repository };
};

export const REFRESH_TOKEN_VALUE = "refresh-token-value-abc123";
export const DEVICE_ID = "33333333-3333-4333-8333-333333333333";
export const USER_ID = "22222222-2222-4222-8222-222222222222";

export const makeRefreshToken = (overrides: Record<string, unknown> = {}) => ({
  token: REFRESH_TOKEN_VALUE,
  userId: USER_ID,
  deviceId: DEVICE_ID,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date("2024-01-01"),
  deletedAt: null,
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

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
