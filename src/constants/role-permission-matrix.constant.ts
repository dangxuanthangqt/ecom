import {
  Action,
  buildPermissionKey,
  PermissionKey,
  Resource,
  ResourceType,
  Scope,
  ScopeType,
} from "./permission.constant";
import { Role, RoleType } from "./role.constant";

/**
 * What each system role is granted. This is the seed for `admin`, `seller` and
 * `client`; `seedSystemRoleGrants` in `initial-scripts/` writes it to the
 * database and re-applies it on every seed, so for these three roles this file
 * is the source of truth and the database is a copy. Roles created through the
 * API are the other way round: the database is their only source.
 *
 * It lives in code on purpose. Widening what `client` may do is a security
 * change, and a security change belongs in a diff someone reads, not in a row
 * someone edits.
 *
 * Reading the table: a role that holds `x:y:any` can do `x:y` to every record;
 * `x:y:own` only to records it owns. `any` implies `own`.
 */

const crud = (resource: ResourceType, scope: ScopeType): PermissionKey[] => [
  buildPermissionKey(resource, Action.CREATE, scope),
  buildPermissionKey(resource, Action.READ, scope),
  buildPermissionKey(resource, Action.UPDATE, scope),
  buildPermissionKey(resource, Action.DELETE, scope),
];

/** Every signed-in account gets these, whatever else its role adds. */
const EVERY_ACCOUNT: PermissionKey[] = [
  "profile:read:own",
  "profile:update:own",
  "session:revoke:own",
  "cart:read:own",
  "cart:update:own",
  "order:create:own",
  "order:read:own",
  "order:cancel:own",
  "review:create:own",
  "review:update:own",
  "review:delete:own",
  "media:upload:own",
  "media:read:any",
  // Reference data every storefront screen needs. Read-only: the client used
  // to hold create/update/delete on brands and categories by accident.
  "brand:read:any",
  "category:read:any",
];

const SELLER_ONLY: PermissionKey[] = [
  ...crud(Resource.PRODUCT, Scope.OWN),
  ...crud(Resource.PRODUCT_TRANSLATION, Scope.OWN),
  "order-fulfilment:read:own",
  "order-fulfilment:update:own",
];

const ADMIN_ONLY: PermissionKey[] = [
  ...crud(Resource.PRODUCT, Scope.ANY),
  ...crud(Resource.PRODUCT_TRANSLATION, Scope.ANY),
  ...crud(Resource.BRAND, Scope.ANY),
  ...crud(Resource.BRAND_TRANSLATION, Scope.ANY),
  ...crud(Resource.CATEGORY, Scope.ANY),
  ...crud(Resource.CATEGORY_TRANSLATION, Scope.ANY),
  ...crud(Resource.LANGUAGE, Scope.ANY),
  ...crud(Resource.USER, Scope.ANY),
  ...crud(Resource.ROLE, Scope.ANY),
  "permission:read:any",
  "order:read:any",
  "order-fulfilment:read:any",
  "order-fulfilment:update:any",
  // Moderation: take down any review.
  "review:delete:any",
  // No table records who uploaded what, so ownership of a media object cannot
  // be established and `media:delete` cannot be scoped to `own`. Admin only
  // until that table exists.
  "media:delete:any",
];

const unique = (keys: PermissionKey[]): readonly PermissionKey[] =>
  Array.from(new Set(keys));

export const RolePermissionMatrix: Record<RoleType, readonly PermissionKey[]> =
  {
    [Role.ADMIN]: unique([...EVERY_ACCOUNT, ...SELLER_ONLY, ...ADMIN_ONLY]),
    [Role.SELLER]: unique([...EVERY_ACCOUNT, ...SELLER_ONLY]),
    [Role.CLIENT]: unique([...EVERY_ACCOUNT]),
  };
