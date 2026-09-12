import { Test } from "@nestjs/testing";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "@/shared/services/prisma.service";

import { PermissionRepository } from "../permission.repository";

export const createPermissionRepositoryMocks = () => ({
  prismaService: {
    permission: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type PermissionRepositoryMocks = ReturnType<
  typeof createPermissionRepositoryMocks
>;

export const buildPermissionRepository = async (
  mocks: PermissionRepositoryMocks,
): Promise<PermissionRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PermissionRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<PermissionRepository>(PermissionRepository);
};

export const setupPermissionRepository = async () => {
  const mocks = createPermissionRepositoryMocks();
  const repository = await buildPermissionRepository(mocks);

  return { mocks, repository };
};

export const PERMISSION_ID = "11111111-1111-4111-8111-111111111111";
export const ROLE_ID = "22222222-2222-4222-8222-222222222222";

export const makePermission = (overrides: Record<string, unknown> = {}) => ({
  id: PERMISSION_ID,
  name: "read",
  description: "Read permission",
  path: "/api/users",
  method: "GET",
  module: "users",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  createdById: null,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  roles: [],
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
