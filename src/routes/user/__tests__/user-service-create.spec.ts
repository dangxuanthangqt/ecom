import { UnprocessableEntityException } from "@nestjs/common";

import { CreateUserRequestDto } from "@/dtos/user/user.dto";
import { userWithRoleAndPermissionsSelect } from "@/selectors/user.selector";

import { UserService } from "../user.service";

import {
  ACTIVE_USER_ID,
  ADMIN_ROLE_ID,
  CLIENT_ROLE_ID,
  containing,
  expectForbidden,
  makeUser,
  SELLER_ROLE_ID,
  setupUserService,
  stubRoleIds,
  UserServiceMocks,
} from "./user-service-test-harness";

describe("UserService - createUser", () => {
  let service: UserService;
  let mocks: UserServiceMocks;

  const makeBody = (overrides: Partial<CreateUserRequestDto> = {}) =>
    ({
      name: "John Doe",
      email: "user@example.com",
      password: "securePassword123",
      phoneNumber: "0987654321",
      status: "ACTIVE",
      ...overrides,
    }) as CreateUserRequestDto;

  const createAs = (activeRoleId: string, body = makeBody()) =>
    service.createUser({ body, activeRoleId, activeUserId: ACTIVE_USER_ID });

  beforeEach(async () => {
    ({ service, mocks } = await setupUserService());
    stubRoleIds(mocks);
    mocks.hashingService.hash.mockReturnValue("hashed-password");
    mocks.sharedUserRepository.createUser.mockResolvedValue(makeUser());
  });

  it("lets an admin create another admin", async () => {
    // Arrange
    const body = makeBody({ roleId: ADMIN_ROLE_ID });

    // Act
    await createAs(ADMIN_ROLE_ID, body);

    // Assert
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalledWith(
      containing({
        data: containing({ roleId: ADMIN_ROLE_ID }),
      }),
    );
  });

  it("refuses a non-admin trying to create an admin, and persists nothing", async () => {
    // Arrange
    const body = makeBody({ roleId: ADMIN_ROLE_ID });

    // Act
    const promise = createAs(SELLER_ROLE_ID, body);

    // Assert
    await expectForbidden(
      promise,
      "You are not allowed to create an admin user.",
    );
    expect(mocks.sharedUserRepository.createUser).not.toHaveBeenCalled();
    expect(mocks.hashingService.hash).not.toHaveBeenCalled();
  });

  it("lets a non-admin create a user under a non-admin role", async () => {
    // Arrange
    const body = makeBody({ roleId: CLIENT_ROLE_ID });

    // Act
    await createAs(SELLER_ROLE_ID, body);

    // Assert
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalledWith(
      containing({
        data: containing({ roleId: CLIENT_ROLE_ID }),
      }),
    );
  });

  it("falls back to the client role when no role is requested", async () => {
    // Arrange
    const body = makeBody();

    // Act
    await createAs(ADMIN_ROLE_ID, body);

    // Assert
    expect(mocks.sharedRoleRepository.getClientRoleId).toHaveBeenCalledTimes(1);
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalledWith(
      containing({
        data: containing({ roleId: CLIENT_ROLE_ID }),
      }),
    );
  });

  it("hashes the password and stamps the creator onto the new row", async () => {
    // Arrange
    const body = makeBody({ avatar: "https://example.com/a.jpg" });

    // Act
    await createAs(ADMIN_ROLE_ID, body);

    // Assert
    expect(mocks.hashingService.hash).toHaveBeenCalledWith("securePassword123");
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalledWith({
      data: {
        name: "John Doe",
        email: "user@example.com",
        password: "hashed-password",
        phoneNumber: "0987654321",
        roleId: CLIENT_ROLE_ID,
        avatar: "https://example.com/a.jpg",
        status: "ACTIVE",
        createdById: ACTIVE_USER_ID,
      },
      select: userWithRoleAndPermissionsSelect,
    });
  });

  it("returns the created row untouched", async () => {
    // Arrange
    const created = makeUser({ name: "Created" });
    mocks.sharedUserRepository.createUser.mockResolvedValue(created);

    // Act
    const result = await createAs(ADMIN_ROLE_ID);

    // Assert
    expect(result).toBe(created);
  });

  it("propagates a duplicate-email rejection from the repository", async () => {
    // Arrange
    const conflict = new UnprocessableEntityException({
      message: "Email is already exist.",
    });
    mocks.sharedUserRepository.createUser.mockRejectedValue(conflict);

    // Act
    const promise = createAs(ADMIN_ROLE_ID);

    // Assert
    await expect(promise).rejects.toBe(conflict);
  });
});
