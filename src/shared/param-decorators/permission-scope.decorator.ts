import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { REQUEST_GRANTED_PERMISSIONS_KEY } from "@/constants/auth.constant";
import {
  ActionType,
  PermissionKey,
  ResourceType,
  ScopeType,
} from "@/constants/permission.constant";
import { scopeOf } from "@/shared/utils/permission.util";

/**
 * Hands a handler the scope the caller holds for one resource and action, so
 * the service can decide how much data to show without ever seeing a role
 * name. Replaces the `roleName === "admin"` comparisons that used to live in
 * the services.
 */
export const PermissionScope = createParamDecorator(
  (
    [resource, action]: [ResourceType, ActionType],
    context: ExecutionContext,
  ): ScopeType => {
    const request = context.switchToHttp().getRequest<Request>();
    const granted = request[REQUEST_GRANTED_PERMISSIONS_KEY] as
      | ReadonlySet<PermissionKey>
      | undefined;

    return scopeOf(granted ?? new Set(), resource, action);
  },
);
