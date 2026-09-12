import { CreateRoleRequestDto } from "@/dtos/role/role.dto";

import { RoleService } from "../role.service";

import {
  CREATOR_USER_ID,
  CUSTOM_ROLE_ID,
  containing,
  makeRole,
  PERM_ID_1,
  PERM_ID_2,
  RoleServiceMocks,
  setupRoleService,
} from "./role-service-test-harness";

describe("RoleService - createRole", () => {
  let service: RoleService;
  let mocks: RoleServiceMocks;

  const makeBody = (overrides: Partial<CreateRoleRequestDto> = {}) =>
    ({
      name: "Custom Role",
      description: "Test role",
      permissionIds: [],
      ...overrides,
    }) as CreateRoleRequestDto;

  const createAs = (body = makeBody()) =>
    service.createRole({ body, userId: CREATOR_USER_ID });

  beforeEach(async () => {
    ({ service, mocks } = await setupRoleService());
    mocks.roleRepository.createRole.mockResolvedValue(makeRole());
  });

  it("creates a role with the provided name and description", async () => {
    // Arrange
    const body = makeBody({ name: "Manager", description: "Manager role" });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.roleRepository.createRole).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "Manager",
          description: "Manager role",
          createdById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("passes permissionIds to the repository", async () => {
    // Arrange
    const body = makeBody({
      permissionIds: [PERM_ID_1, PERM_ID_2],
    });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.roleRepository.createRole).toHaveBeenCalledWith(
      containing({
        permissionIds: [PERM_ID_1, PERM_ID_2],
      }),
    );
  });

  it("passes empty permissionIds array when not provided", async () => {
    // Arrange
    const body = makeBody({ permissionIds: [] });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.roleRepository.createRole).toHaveBeenCalledWith(
      containing({
        permissionIds: [],
      }),
    );
  });

  it("stamps the creator userId on the new role", async () => {
    // Arrange
    const body = makeBody();

    // Act
    await createAs(body);

    // Assert
    expect(mocks.roleRepository.createRole).toHaveBeenCalledWith(
      containing({
        data: containing({
          createdById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("returns the created role from the repository", async () => {
    // Arrange
    const created = makeRole({ id: CUSTOM_ROLE_ID, name: "Created Role" });
    mocks.roleRepository.createRole.mockResolvedValue(created);

    // Act
    const result = await createAs();

    // Assert
    expect(result).toBe(created);
  });

  it("propagates validation errors from the repository", async () => {
    // Arrange
    const error = new Error("Duplicate role name");
    mocks.roleRepository.createRole.mockRejectedValue(error);

    // Act
    const promise = createAs();

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
