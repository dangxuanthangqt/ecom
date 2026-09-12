import { Test } from "@nestjs/testing";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "@/shared/services/prisma.service";

import { LanguageRepository } from "../language.repository";

export const createLanguageRepositoryMocks = () => ({
  prismaService: {
    language: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
});

export type LanguageRepositoryMocks = ReturnType<
  typeof createLanguageRepositoryMocks
>;

export const buildLanguageRepository = async (
  mocks: LanguageRepositoryMocks,
): Promise<LanguageRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      LanguageRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<LanguageRepository>(LanguageRepository);
};

export const setupLanguageRepository = async () => {
  const mocks = createLanguageRepositoryMocks();
  const repository = await buildLanguageRepository(mocks);

  return { mocks, repository };
};

export const LANGUAGE_ID = "en";
export const USER_ID = "11111111-1111-4111-8111-111111111111";

export const makeLanguage = (overrides: Record<string, unknown> = {}) => ({
  id: LANGUAGE_ID,
  name: "English",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  createdById: USER_ID,
  updatedById: null,
  deletedById: null,
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
