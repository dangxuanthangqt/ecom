import { ProfileService } from "../profile.service";

import {
  makeUser,
  setupProfileService,
  USER_ID,
  ProfileServiceMocks,
} from "./profile-service-test-harness";

/** `expect.any(Object)` typed, to keep `any` out of assertions. */
const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;

describe("ProfileService - getProfile", () => {
  let service: ProfileService;
  let mocks: ProfileServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProfileService());
  });

  it("retrieves the user profile when the user exists and is not deleted", async () => {
    // Arrange
    const user = makeUser();
    mocks.sharedUserRepository.findUnique.mockResolvedValue(user);

    // Act
    const result = await service.getProfile(USER_ID);

    // Assert
    expect(result).toBe(user);
    expect(mocks.sharedUserRepository.findUnique).toHaveBeenCalledWith({
      where: {
        id: USER_ID,
        deletedAt: null,
      },
      select: anyObject(),
    });
  });

  it("throws when the user does not exist", async () => {
    // Arrange
    mocks.sharedUserRepository.findUnique.mockResolvedValue(null);

    // Act
    const promise = service.getProfile(USER_ID);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "User not found." },
    });
  });

  it("throws when the user has been deleted", async () => {
    // Arrange
    mocks.sharedUserRepository.findUnique.mockResolvedValue(null);

    // Act
    const promise = service.getProfile(USER_ID);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 404,
    });
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Database connection failed");
    mocks.sharedUserRepository.findUnique.mockRejectedValue(error);

    // Act
    const promise = service.getProfile(USER_ID);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
