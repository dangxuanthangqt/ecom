import { SetMetadata } from "@nestjs/common";

import { PermissionKey } from "@/constants/permission.constant";

export const PERMISSION_KEY = "required_permission";

/**
 * Declares the permission a handler needs. `AccessTokenGuard` reads it; the
 * boot-time coverage check refuses to start the app if a non-public route is
 * missing it. The parameter is typed, so a misspelt key fails to compile.
 */
export const RequirePermission = (key: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, key);
