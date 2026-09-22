import { UnprocessableEntityException } from "@nestjs/common";

import { RoleWithPermissionsResponseDto } from "@/dtos/role/role.dto";
import { PageDto } from "@/dtos/shared/page.dto";

import { RoleController } from "../role.controller";

import {
  RoleControllerMocks,
  makePaginatedRoles,
  makeRoleWithPermissions,
  setupRoleController,
  ROLE_ID,
} from "./role-controller-test-harness";

describe("RoleController - getRoles", () => {
  let controller: RoleController;
  let mocks: RoleControllerMocks;

  const makePaginationQuery = () => ({ page: 1, pageSize: 10 });

  beforeEach(async () => {
    ({ controller, mocks } = await setupRoleController());
  });

  it("calls roleService.getRoles with the pagination query", async () => {
    // Arrange
    const query = makePaginationQuery();
    mocks.roleService.getRoles.mockResolvedValue(makePaginatedRoles());

    // Act
    await controller.getRoles(query);

    // Assert
    expect(mocks.roleService.getRoles).toHaveBeenCalledWith(query);
  });

  it("returns paginated roles wrapped in PageDto", async () => {
    // Arrange
    const roleItems = [
      makeRoleWithPermissions({ name: "ADMIN" }),
      makeRoleWithPermissions({ name: "USER" }),
    ];
    const serviceResponse = {
      data: roleItems,
      pagination: {
        totalPages: 1,
        totalItems: 2,
        pageSize: 10,
        page: 1,
      },
    };
    mocks.roleService.getRoles.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getRoles(makePaginationQuery());

    // Assert
    expect(result).toBeInstanceOf(PageDto);
    expect(result.data).toHaveLength(2);
  });

  it("propagates rejection from roleService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Database error");
    mocks.roleService.getRoles.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getRoles(makePaginationQuery())).rejects.toBe(
      error,
    );
  });
});

describe("RoleController - getRoleById", () => {
  let controller: RoleController;
  let mocks: RoleControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupRoleController());
  });

  it("calls roleService.getRoleById with the role ID", async () => {
    // Arrange
    mocks.roleService.getRoleById.mockResolvedValue(makeRoleWithPermissions());

    // Act
    await controller.getRoleById(ROLE_ID);

    // Assert
    expect(mocks.roleService.getRoleById).toHaveBeenCalledWith(ROLE_ID);
  });

  it("returns the role wrapped in RoleWithPermissionsResponseDto", async () => {
    // Arrange
    const serviceResponse = makeRoleWithPermissions({
      id: ROLE_ID,
      name: "ADMIN",
    });
    mocks.roleService.getRoleById.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getRoleById(ROLE_ID);

    // Assert
    expect(result).toBeInstanceOf(RoleWithPermissionsResponseDto);
    expect(result.name).toBe("ADMIN");
  });

  it("propagates rejection from roleService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Role not found");
    mocks.roleService.getRoleById.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getRoleById(ROLE_ID)).rejects.toBe(error);
  });
});
