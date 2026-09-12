import { Test } from "@nestjs/testing";

import { ProfileController } from "../profile.controller";
import { ProfileService } from "../profile.service";

/**
 * Test doubles for every collaborator ProfileController depends on.
 * Only the methods ProfileController actually calls are stubbed.
 */
export const createProfileControllerMocks = () => ({
  profileService: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  },
});

export type ProfileControllerMocks = ReturnType<
  typeof createProfileControllerMocks
>;

/** Builds ProfileController through the Nest DI container with all deps mocked. */
export const buildProfileController = async (
  mocks: ProfileControllerMocks,
): Promise<ProfileController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProfileController],
    providers: [{ provide: ProfileService, useValue: mocks.profileService }],
  }).compile();

  return moduleRef.get<ProfileController>(ProfileController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupProfileController = async () => {
  const mocks = createProfileControllerMocks();
  const controller = await buildProfileController(mocks);

  return { mocks, controller };
};

export const ACTIVE_USER_ID = "44444444-4444-4444-8444-444444444444";

/** A profile response as the service returns it. */
export const makeProfileResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: ACTIVE_USER_ID,
  name: "John Doe",
  email: "user@example.com",
  phoneNumber: "0987654321",
  avatar: null,
  status: "ACTIVE",
  role: { id: "role-id", name: "ADMIN", permissions: [] },
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
