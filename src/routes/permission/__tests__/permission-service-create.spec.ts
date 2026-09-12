import { CreatePermissionRequestDto } from "@/dtos/permission/permission.dto";

import { PermissionService } from "../permission.service";

import {
  containing,
  CREATOR_USER_ID,
  makePermission,
  PERMISSION_ID,
  ROLE_ID_1,
  ROLE_ID_2,
  PermissionServiceMocks,
  setupPermissionService,
} from "./permission-service-test-harness";

describe("PermissionService - createPermission", () => {
  let service: PermissionService;
  let mocks: PermissionServiceMocks;

  const makeBody = (overrides: Partial<CreatePermissionRequestDto> = {}) =>
    ({
      name: "Create User",
      description: "Allows creating new users",
      path: "/users/create",
      method: "POST",
      rolesIds: [],
      ...overrides,
    }) as CreatePermissionRequestDto;

  const createAs = (body = makeBody()) =>
    service.createPermission({ body, userId: CREATOR_USER_ID });

  beforeEach(async () => {
    ({ service, mocks } = await setupPermissionService());
    mocks.permissionRepository.createPermission.mockResolvedValue(
      makePermission(),
    );
  });

  it("creates a permission with the provided details", async () => {
    // Arrange
    const body = makeBody({
      name: "Delete User",
      description: "Allows deleting users",
      path: "/users",
      method: "DELETE",
    });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "Delete User",
          description: "Allows deleting users",
          path: "/users",
          method: "DELETE",
          createdById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("extracts module from path by taking the second segment and uppercasing", async () => {
    // Arrange
    const body = makeBody({ path: "/users/profile/update" });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          module: "USERS",
        }),
      }),
    );
  });

  it("extracts module from nested paths", async () => {
    // Arrange
    const body = makeBody({ path: "/products/categories/list" });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          module: "PRODUCTS",
        }),
      }),
    );
  });

  it("passes rolesIds to the repository", async () => {
    // Arrange
    const body = makeBody({
      rolesIds: [ROLE_ID_1, ROLE_ID_2],
    });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        rolesIds: [ROLE_ID_1, ROLE_ID_2],
      }),
    );
  });

  it("passes empty rolesIds array when not provided", async () => {
    // Arrange
    const body = makeBody({ rolesIds: [] });

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        rolesIds: [],
      }),
    );
  });

  it("stamps the creator userId on the new permission", async () => {
    // Arrange
    const body = makeBody();

    // Act
    await createAs(body);

    // Assert
    expect(mocks.permissionRepository.createPermission).toHaveBeenCalledWith(
      containing({
        data: containing({
          createdById: CREATOR_USER_ID,
        }),
      }),
    );
  });

  it("returns the created permission from the repository", async () => {
    // Arrange
    const created = makePermission({ id: PERMISSION_ID });
    mocks.permissionRepository.createPermission.mockResolvedValue(created);

    // Act
    const result = await createAs();

    // Assert
    expect(result).toBe(created);
  });

  it("propagates validation errors from the repository", async () => {
    // Arrange
    const error = new Error("Duplicate permission");
    mocks.permissionRepository.createPermission.mockRejectedValue(error);

    // Act
    const promise = createAs();

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
