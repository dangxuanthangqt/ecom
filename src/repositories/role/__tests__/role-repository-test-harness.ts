import { Test } from "@nestjs/testing";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "@/shared/services/prisma.service";

import { RoleRepository } from "../role.repository";
import { SharedRoleRepository } from "../shared-role.repository";

export const createRoleRepositoryMocks = () => ({
  prismaService: {
    role: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirstOrThrow: jest.fn(),
      count: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
  },
});

export type RoleRepositoryMocks = ReturnType<typeof createRoleRepositoryMocks>;

export const buildRoleRepository = async (
  mocks: RoleRepositoryMocks,
): Promise<RoleRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      RoleRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<RoleRepository>(RoleRepository);
};

export const buildSharedRoleRepository = async (
  mocks: RoleRepositoryMocks,
): Promise<SharedRoleRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SharedRoleRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<SharedRoleRepository>(SharedRoleRepository);
};

export const setupRoleRepository = async () => {
  const mocks = createRoleRepositoryMocks();
  const repository = await buildRoleRepository(mocks);

  return { mocks, repository };
};

export const setupSharedRoleRepository = async () => {
  const mocks = createRoleRepositoryMocks();
  const repository = await buildSharedRoleRepository(mocks);

  return { mocks, repository };
};

export const ADMIN_ROLE_ID = "11111111-1111-4111-8111-111111111111";
export const CLIENT_ROLE_ID = "22222222-2222-4222-8222-222222222222";
export const SELLER_ROLE_ID = "33333333-3333-4333-8333-333333333333";
export const PERMISSION_ID = "44444444-4444-4444-8444-444444444444";

export const makeRole = (overrides: Record<string, unknown> = {}) => ({
  id: ADMIN_ROLE_ID,
  name: "admin",
  description: "Admin role",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  createdById: null,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  permissions: [],
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;

export const arrayContaining = <T>(items: T[]): T[] =>
  expect.arrayContaining(items) as unknown as T[];

export const createPrismaUniqueError = () =>
  new PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  });

export const createPrismaNotFoundError = () =>
  new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "5.0.0",
  });

export const createPrismaForeignKeyError = () =>
  new PrismaClientKnownRequestError("Foreign key constraint failed", {
    code: "P2003",
    clientVersion: "5.0.0",
  });
