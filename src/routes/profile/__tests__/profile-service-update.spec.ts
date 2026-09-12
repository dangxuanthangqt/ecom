import { ProfileService } from "../profile.service";

import {
  containing,
  makeUser,
  setupProfileService,
  USER_ID,
  ProfileServiceMocks,
} from "./profile-service-test-harness";

describe("ProfileService - updateProfile", () => {
  let service: ProfileService;
  let mocks: ProfileServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupProfileService());
    mocks.sharedUserRepository.updateUser.mockResolvedValue(
      makeUser({ name: "Updated Name" }),
    );
  });

  it("updates the user profile with supplied data", async () => {
    // Act
    await service.updateProfile({
      userId: USER_ID,
      data: {
        name: "Updated Name",
        phoneNumber: "0123456789",
      },
    });

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith({
      where: containing({
        id: USER_ID,
        deletedAt: null,
      }),
      data: containing({
        name: "Updated Name",
        phoneNumber: "0123456789",
        updatedById: USER_ID,
      }),
      select: expect.any(Object),
    });
  });

  it("stamps the current user as the updater", async () => {
    // Act
    await service.updateProfile({
      userId: USER_ID,
      data: { name: "New Name" },
    });

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith(
      containing({
        data: containing({
          updatedById: USER_ID,
        }),
      }),
    );
  });

  it("returns the updated profile untouched", async () => {
    // Arrange
    const updated = makeUser({ name: "Jane Doe", phoneNumber: "1234567890" });
    mocks.sharedUserRepository.updateUser.mockResolvedValue(updated);

    // Act
    const result = await service.updateProfile({
      userId: USER_ID,
      data: { name: "Jane Doe", phoneNumber: "1234567890" },
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("updates only the avatar when nothing else is supplied", async () => {
    // Act
    await service.updateProfile({
      userId: USER_ID,
      data: {
        avatar: "https://example.com/avatar.jpg",
      },
    });

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith(
      containing({
        data: containing({
          avatar: "https://example.com/avatar.jpg",
        }),
      }),
    );
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Update failed");
    mocks.sharedUserRepository.updateUser.mockRejectedValue(error);

    // Act
    const promise = service.updateProfile({
      userId: USER_ID,
      data: { name: "New Name" },
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("only updates deleted-at null users", async () => {
    // Act
    await service.updateProfile({
      userId: USER_ID,
      data: { name: "Name" },
    });

    // Assert
    expect(mocks.sharedUserRepository.updateUser).toHaveBeenCalledWith(
      containing({
        where: containing({ deletedAt: null }),
      }),
    );
  });
});
