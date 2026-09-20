/**
 * The authorization vocabulary. Every permission in the system is one string of
 * the shape `resource:action:scope`, for example `product:update:own`.
 *
 * - `resource` names a business capability, not a database table. Two routes
 *   that touch the same Prisma model can be two different resources when they
 *   are different capabilities: browsing the public catalogue is not the same
 *   thing as managing your own inventory.
 * - `action` is what is being done to it.
 * - `scope` says how far the grant reaches: `own` is limited to records the
 *   caller owns, `any` is unrestricted. `any` always implies `own`.
 *
 * Keys are declared on handlers with `@RequirePermission(...)` and granted to
 * roles in the database. This file is the closed list of words a key may be
 * built from; the template-literal `PermissionKey` type makes a misspelt key a
 * compile error rather than a silent 403.
 */

export const Resource = {
  PRODUCT: "product",
  BRAND: "brand",
  CATEGORY: "category",
  LANGUAGE: "language",
  PRODUCT_TRANSLATION: "product-translation",
  BRAND_TRANSLATION: "brand-translation",
  CATEGORY_TRANSLATION: "category-translation",
  CART: "cart",
  ORDER: "order",
  /** The seller/admin side of an order: viewing incoming orders, advancing status. */
  ORDER_FULFILMENT: "order-fulfilment",
  REVIEW: "review",
  MEDIA: "media",
  PROFILE: "profile",
  /** The caller's own login session — logout. */
  SESSION: "session",
  USER: "user",
  ROLE: "role",
  PERMISSION: "permission",
} as const;

export const Action = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  CANCEL: "cancel",
  UPLOAD: "upload",
  REVOKE: "revoke",
} as const;

export const Scope = {
  OWN: "own",
  ANY: "any",
} as const;

export type ResourceType = (typeof Resource)[keyof typeof Resource];
export type ActionType = (typeof Action)[keyof typeof Action];
export type ScopeType = (typeof Scope)[keyof typeof Scope];

/** `"product:update:own"` compiles; `"product:updat:own"` does not. */
export type PermissionKey = `${ResourceType}:${ActionType}:${ScopeType}`;

export type ParsedPermissionKey = {
  resource: ResourceType;
  action: ActionType;
  scope: ScopeType;
};

const RESOURCES = new Set<string>(Object.values(Resource));
const ACTIONS = new Set<string>(Object.values(Action));
const SCOPES = new Set<string>(Object.values(Scope));

/**
 * Runtime twin of the `PermissionKey` type, for data that did not come through
 * the compiler: rows read back from the database, values in a seed file.
 */
export const isPermissionKey = (value: unknown): value is PermissionKey => {
  if (typeof value !== "string") {
    return false;
  }

  const parts = value.split(":");

  return (
    parts.length === 3 &&
    RESOURCES.has(parts[0]) &&
    ACTIONS.has(parts[1]) &&
    SCOPES.has(parts[2])
  );
};

export const parsePermissionKey = (key: PermissionKey): ParsedPermissionKey => {
  const [resource, action, scope] = key.split(":") as [
    ResourceType,
    ActionType,
    ScopeType,
  ];

  return { resource, action, scope };
};

export const buildPermissionKey = (
  resource: ResourceType,
  action: ActionType,
  scope: ScopeType,
): PermissionKey => `${resource}:${action}:${scope}`;
