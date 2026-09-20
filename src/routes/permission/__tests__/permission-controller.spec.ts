import { UnprocessableEntityException } from "@nestjs/common";

import { PermissionWithRolesResponseDto } from "@/dtos/permission/permission.dto";
import { PageDto } from "@/dtos/shared/page.dto";

import { PermissionController } from "../permission.controller";

import {
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
    const items = [
      makePermissionWithRoles({ key: "user:read:any" }),
      makePermissionWithRoles({ key: "user:update:any" }),
    ];
    mocks.permissionService.getPermissions.mockResolvedValue(
      makePaginatedPermissions(items),
    );

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
    mocks.permissionService.getPermissionById.mockResolvedValue(
      makePermissionWithRoles({ id: PERMISSION_ID, key: "user:read:any" }),
    );

    // Act
    const result = await controller.getPermissionById(PERMISSION_ID);

    // Assert
    expect(result).toBeInstanceOf(PermissionWithRolesResponseDto);
    expect(result.key).toBe("user:read:any");
    expect(result.scope).toBe("own");
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

describe("PermissionController - surface", () => {
  it("exposes no write methods: the catalogue is owned by code", async () => {
    // Arrange
    const { controller } = await setupPermissionController();
    const prototype = Object.getPrototypeOf(controller) as Record<
      string,
      unknown
    >;

    // Act
    const methods = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== "constructor",
    );

    // Assert — a create/update/delete here would let an admin invent a key no
    // handler references, or rewrite one a handler does
    expect(methods.sort()).toEqual(["getPermissionById", "getPermissions"]);
  });
});
