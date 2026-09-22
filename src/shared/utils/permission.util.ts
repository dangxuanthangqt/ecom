import {
  ActionType,
  buildPermissionKey,
  parsePermissionKey,
  PermissionKey,
  ResourceType,
  Scope,
  ScopeType,
} from "@/constants/permission.constant";

/**
 * Does the caller's grant set cover what a handler asks for?
 *
 * A handler declares the *minimum* it needs. Holding the exact key satisfies
 * it, and so does holding the `any` form of an `own` requirement — `any`
 * always implies `own`. An `any` requirement is satisfied only by `any`.
 */
export const satisfies = (
  granted: ReadonlySet<string>,
  required: PermissionKey,
): boolean => {
  if (granted.has(required)) {
    return true;
  }

  const { resource, action, scope } = parsePermissionKey(required);

  return (
    scope === Scope.OWN &&
    granted.has(buildPermissionKey(resource, action, Scope.ANY))
  );
};

/**
 * How far the caller's grant reaches for one resource and action, for the
 * service layer to turn into a `where` clause: `any` means no owner filter,
 * `own` means filter by the caller's id.
 *
 * Call this only after the guard has already admitted the request, so at least
 * the `own` form is known to be held; it does not itself authorize anything.
 */
export const scopeOf = (
  granted: ReadonlySet<string>,
  resource: ResourceType,
  action: ActionType,
): ScopeType =>
  granted.has(buildPermissionKey(resource, action, Scope.ANY))
    ? Scope.ANY
    : Scope.OWN;

/**
 * The catalogue a set of handler declarations implies.
 *
 * Handlers declare the *minimum* scope they need, so a route that serves both
 * "seller sees own" and "admin sees all" declares only `x:y:own`. The `x:y:any`
 * that admin is granted never appears on a handler — yet it must exist as a
 * catalogue row or it cannot be granted. This adds the `any` form for every
 * declared `own` key. The reverse is not done: a route that requires `any`
 * has no meaningful `own` variant.
 */
export const withAnyCounterparts = (
  declared: Iterable<PermissionKey>,
): PermissionKey[] => {
  const keys = new Set<PermissionKey>(declared);

  for (const key of Array.from(keys)) {
    const { resource, action, scope } = parsePermissionKey(key);

    if (scope === Scope.OWN) {
      keys.add(buildPermissionKey(resource, action, Scope.ANY));
    }
  }

  return Array.from(keys).sort();
};
