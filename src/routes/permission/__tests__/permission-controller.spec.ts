import { UnprocessableEntityException } from "@nestjs/common";

import {
  CreatePermissionRequestDto,
  PermissionWithRolesResponseDto,
  UpdatePermissionRequestDto,
} from "@/dtos/permission/permission.dto";
import { PageDto } from "@/dtos/shared/page.dto";

import { PermissionController } from "../permission.controller";

import {
  ACTIVE_USER_ID,
  PERMISSION_ID,
  PermissionControllerMocks,
  makePaginatedPermissions,
  makePermissionWithRoles,
  setupPermissionController,
} from "./permission-controller-test-harness";

describe("PermissionController - getPermissions", () => {
  let controller: PermissionController;
  let mocks: PermissionControllerMocks;

  const makePaginationQuery = () => ({ pageIndex: 0, pageSize: 10 });

  beforeEach(async () => {
    ({ controller, mocks } = await setupPermissionController());
  });

  it("calls permissionService.getPermissions with the pagination query", async () => {
    // Arrange
    const query = makePaginationQuery();
    mocks.permissionService.getPermissions.mockResolvedValue(
      makePaginatedPermissions(),
    );

    // Act
    await controller.getPermissions(query);

    // Assert
    expect(mocks.permissionService.getPermissions).toHaveBeenCalledWith(query);
  });

  it("returns paginated permissions wrapped in PageDto", async () => {
    // Arrange
    const permItems = [
      makePermissionWithRoles({ name: "users.read" }),
      makePermissionWithRoles({ name: "users.write" }),
    ];
    const serviceResponse = {
      data: permItems,
      pagination: {
        totalPages: 1,
        totalItems: 2,
        pageSize: 10,
        pageIndex: 0,
      },
    };
    mocks.permissionService.getPermissions.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getPermissions(makePaginationQuery());

    // Assert
    expect(result).toBeInstanceOf(PageDto);
    expect(result.data).toHaveLength(2);
  });

  it("propagates rejection from permissionService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Database error");
    mocks.permissionService.getPermissions.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getPermissions(makePaginationQuery())).rejects.toBe(
      error,
    );
  });
});

describe("PermissionController - getPermissionById", () => {
  let controller: PermissionController;
  let mocks: PermissionControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupPermissionController());
  });

  it("calls permissionService.getPermissionById with the permission ID", async () => {
    // Arrange
    mocks.permissionService.getPermissionById.mockResolvedValue(
      makePermissionWithRoles(),
    );

    // Act
    await controller.getPermissionById(PERMISSION_ID);

    // Assert
    expect(mocks.permissionService.getPermissionById).toHaveBeenCalledWith(
      PERMISSION_ID,
    );
  });

  it("returns the permission wrapped in PermissionWithRolesResponseDto", async () => {
    // Arrange
    const serviceResponse = makePermissionWithRoles({
      id: PERMISSION_ID,
      name: "users.read",
    });
    mocks.permissionService.getPermissionById.mockResolvedValue(
      serviceResponse,
    );

    // Act
    const result = await controller.getPermissionById(PERMISSION_ID);

    // Assert
    expect(result).toBeInstanceOf(PermissionWithRolesResponseDto);
    expect(result.name).toBe("users.read");
  });

  it("propagates rejection from permissionService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Permission not found");
    mocks.permissionService.getPermissionById.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getPermissionById(PERMISSION_ID)).rejects.toBe(
      error,
    );
  });
});

describe("PermissionController - createPermission", () => {
  let controller: PermissionController;
  let mocks: PermissionControllerMocks;

  const makeCreateBody = () =>
    ({
      name: "users.create",
      description: "Create users",
      path: "/users",
      method: "POST",
      rolesIds: [],
    }) as CreatePermissionRequestDto;

  beforeEach(async () => {
    ({ controller, mocks } = await setupPermissionController());
  });

  it("calls permissionService.createPermission with body and userId", async () => {
    // Arrange
    const body = makeCreateBody();
    mocks.permissionService.createPermission.mockResolvedValue(
      makePermissionWithRoles(),
    );

    // Act
    await controller.createPermission(body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.permissionService.createPermission).toHaveBeenCalledWith({
      body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("returns the created permission wrapped in PermissionWithRolesResponseDto", async () => {
    // Arrange
    const created = makePermissionWithRoles({ name: "users.create" });
    mocks.permissionService.createPermission.mockResolvedValue(created);

    // Act
    const result = await controller.createPermission(
      makeCreateBody(),
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(PermissionWithRolesResponseDto);
  });

  it("propagates rejection from permissionService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Permission already exists");
    mocks.permissionService.createPermission.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.createPermission(makeCreateBody(), ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("PermissionController - updatePermission", () => {
  let controller: PermissionController;
  let mocks: PermissionControllerMocks;

  const makeUpdateBody = () =>
    ({
      name: "users.update",
      description: "Update users",
      path: "/users",
      method: "PUT",
      rolesIds: [],
    }) as UpdatePermissionRequestDto;

  beforeEach(async () => {
    ({ controller, mocks } = await setupPermissionController());
  });

  it("calls permissionService.updatePermission with id, body, and userId", async () => {
    // Arrange
    const body = makeUpdateBody();
    mocks.permissionService.updatePermission.mockResolvedValue(
      makePermissionWithRoles(),
    );

    // Act
    await controller.updatePermission(PERMISSION_ID, body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.permissionService.updatePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("returns the updated permission wrapped in PermissionWithRolesResponseDto", async () => {
    // Arrange
    const updated = makePermissionWithRoles({
      name: "users.update",
    });
    mocks.permissionService.updatePermission.mockResolvedValue(updated);

    // Act
    const result = await controller.updatePermission(
      PERMISSION_ID,
      makeUpdateBody(),
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(PermissionWithRolesResponseDto);
  });

  it("propagates rejection from permissionService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Permission not found");
    mocks.permissionService.updatePermission.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.updatePermission(
        PERMISSION_ID,
        makeUpdateBody(),
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("PermissionController - deletePermission", () => {
  let controller: PermissionController;
  let mocks: PermissionControllerMocks;

  const makeDeleteBody = () => ({});

  beforeEach(async () => {
    ({ controller, mocks } = await setupPermissionController());
  });

  it("calls permissionService.deletePermission with id, userId, and body", async () => {
    // Arrange
    const body = makeDeleteBody();
    mocks.permissionService.deletePermission.mockResolvedValue(
      makePermissionWithRoles(),
    );

    // Act
    await controller.deletePermission(PERMISSION_ID, ACTIVE_USER_ID, body);

    // Assert
    expect(mocks.permissionService.deletePermission).toHaveBeenCalledWith({
      id: PERMISSION_ID,
      userId: ACTIVE_USER_ID,
      body,
    });
  });

  it("returns the deleted permission wrapped in PermissionWithRolesResponseDto", async () => {
    // Arrange
    const deleted = makePermissionWithRoles();
    mocks.permissionService.deletePermission.mockResolvedValue(deleted);

    // Act
    const result = await controller.deletePermission(
      PERMISSION_ID,
      ACTIVE_USER_ID,
      makeDeleteBody(),
    );

    // Assert
    expect(result).toBeInstanceOf(PermissionWithRolesResponseDto);
  });

  it("propagates rejection from permissionService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Permission not found");
    mocks.permissionService.deletePermission.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.deletePermission(
        PERMISSION_ID,
        ACTIVE_USER_ID,
        makeDeleteBody(),
      ),
    ).rejects.toBe(error);
  });
});
