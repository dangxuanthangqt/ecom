import { Test } from "@nestjs/testing";

import { LanguageController } from "../language.controller";
import { LanguageService } from "../language.service";

/**
 * Test doubles for every collaborator LanguageController depends on.
 * Only the methods LanguageController actually calls are stubbed.
 */
export const createLanguageControllerMocks = () => ({
  languageService: {
    getLanguages: jest.fn(),
    getLanguageById: jest.fn(),
    createLanguage: jest.fn(),
    updateLanguage: jest.fn(),
    deleteLanguage: jest.fn(),
  },
});

export type LanguageControllerMocks = ReturnType<
  typeof createLanguageControllerMocks
>;

/** Builds LanguageController through the Nest DI container with all deps mocked. */
export const buildLanguageController = async (
  mocks: LanguageControllerMocks,
): Promise<LanguageController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [LanguageController],
    providers: [{ provide: LanguageService, useValue: mocks.languageService }],
  }).compile();

  return moduleRef.get<LanguageController>(LanguageController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupLanguageController = async () => {
  const mocks = createLanguageControllerMocks();
  const controller = await buildLanguageController(mocks);

  return { mocks, controller };
};

export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";
export const LANGUAGE_ID = "en-US";

/** A language as the service returns it. */
export const makeLanguage = (overrides: Record<string, unknown> = {}) => ({
  id: LANGUAGE_ID,
  name: "English (US)",
  code: "en",
  ...overrides,
});

/** A paginated list response. */
export const makePaginatedLanguages = (
  overrides: Record<string, unknown> = {},
) => ({
  items: [makeLanguage()],
  total: 1,
  page: 1,
  pageSize: 10,
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
