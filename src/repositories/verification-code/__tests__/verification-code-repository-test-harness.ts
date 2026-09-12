import { Test } from "@nestjs/testing";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "@/shared/services/prisma.service";

import { VerificationCodeRepository } from "../verification-code.repository";

export const createVerificationCodeRepositoryMocks = () => ({
  prismaService: {
    verificationCode: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  },
});

export type VerificationCodeRepositoryMocks = ReturnType<
  typeof createVerificationCodeRepositoryMocks
>;

export const buildVerificationCodeRepository = async (
  mocks: VerificationCodeRepositoryMocks,
): Promise<VerificationCodeRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      VerificationCodeRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<VerificationCodeRepository>(VerificationCodeRepository);
};

export const setupVerificationCodeRepository = async () => {
  const mocks = createVerificationCodeRepositoryMocks();
  const repository = await buildVerificationCodeRepository(mocks);

  return { mocks, repository };
};

export const VERIFICATION_CODE = "123456";
export const EMAIL = "user@example.com";
export const CODE_TYPE = "REGISTER";

export const makeVerificationCode = (
  overrides: Record<string, unknown> = {},
) => ({
  code: VERIFICATION_CODE,
  email: EMAIL,
  type: CODE_TYPE,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  createdAt: new Date("2024-01-01"),
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
