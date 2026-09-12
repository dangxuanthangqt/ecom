import { Test } from "@nestjs/testing";

import { LanguageRepository } from "@/repositories/language/language.repository";

import { LanguageService } from "../language.service";

/**
 * Test doubles for every collaborator LanguageService depends on.
 * Only the methods LanguageService actually calls are stubbed.
 */
export const createLanguageServiceMocks = () => ({
  languageRepository: {
    findManyLanguages: jest.fn(),
    findUniqueLanguage: jest.fn(),
    createLanguage: jest.fn(),
    updateLanguageById: jest.fn(),
    deleteLanguageById: jest.fn(),
  },
});

export type LanguageServiceMocks = ReturnType<
  typeof createLanguageServiceMocks
>;

/** Builds LanguageService through the Nest DI container with all deps mocked. */
export const buildLanguageService = async (
  mocks: LanguageServiceMocks,
): Promise<LanguageService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      LanguageService,
      {
        provide: LanguageRepository,
        useValue: mocks.languageRepository,
      },
    ],
  }).compile();

  return moduleRef.get<LanguageService>(LanguageService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupLanguageService = async () => {
  const mocks = createLanguageServiceMocks();
  const service = await buildLanguageService(mocks);

  return { mocks, service };
};

export const LANGUAGE_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";

/** A persisted language row as the repository returns it. */
export const makeLanguage = (overrides: Record<string, unknown> = {}) => ({
  id: LANGUAGE_ID,
  name: "English",
  createdById: USER_ID,
  createdAt: new Date("2026-01-01"),
  updatedById: USER_ID,
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

/** `expect.any(Date)` typed as a Date, for the same reason as `containing`. */
export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
