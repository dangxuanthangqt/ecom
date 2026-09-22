import { Test } from "@nestjs/testing";

import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/shared/services/prisma.service";

import { SharedUserRepository } from "../shared-user.repository";
import { UserRepository } from "../user.repository";

export const createUserRepositoryMocks = () => ({
  prismaService: {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type UserRepositoryMocks = ReturnType<typeof createUserRepositoryMocks>;

export const buildUserRepository = async (
  mocks: UserRepositoryMocks,
): Promise<UserRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      UserRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<UserRepository>(UserRepository);
};

export const buildSharedUserRepository = async (
  mocks: UserRepositoryMocks,
): Promise<SharedUserRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SharedUserRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<SharedUserRepository>(SharedUserRepository);
};

export const setupUserRepository = async () => {
  const mocks = createUserRepositoryMocks();
  const repository = await buildUserRepository(mocks);

  return { mocks, repository };
};

export const setupSharedUserRepository = async () => {
  const mocks = createUserRepositoryMocks();
  const repository = await buildSharedUserRepository(mocks);

  return { mocks, repository };
};

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const ROLE_ID = "22222222-2222-4222-8222-222222222222";

export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  name: "John Doe",
  email: "john@example.com",
  phoneNumber: "0987654321",
  password: "hashed-password",
  totpSecret: null,
  avatar: null,
  status: "ACTIVE",
  roleId: ROLE_ID,
  createdById: USER_ID,
  updatedById: null,
  deletedById: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
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
