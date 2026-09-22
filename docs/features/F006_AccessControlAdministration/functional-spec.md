---
authored_by: rebuild-spec
---
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F006_AccessControlAdministration

**Priority**: P2
**Type**: mixed
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F006 → N/A (headless, no screens) → US040-US044, US060-US064 → BL001, BL002 → ROUTE041-045, ROUTE061-065 → TC### (not yet generated)

> **⚠️ Partially superseded on 2026-09-21 (RBAC refactor).** This spec was generated against the
> route-based permission model. Since the refactor:
>
> - Permissions are semantic keys `resource:action:scope` declared on handlers with
>   `@RequirePermission`; the `path`/`method`/`module`/`name` columns are gone.
> - `POST/PUT/DELETE /permissions` (FR-203, FR-204, FR-205; actions A3–A5) **no longer exist**. The
>   catalogue is code-owned and read-only over HTTP; grants change on the role side.
> - Roles carry `isSystem`; the hardcoded `forbiddenRoles` array is gone. System roles' grants come
>   from `RolePermissionMatrix` in code and are re-applied on every seed.
> - The module-based allowlist (CAP-03, ALG-002) and its per-method over-grant (D001, RISK-01,
>   RISK-02) are resolved: `client` no longer holds write access to brands/categories/translations.
>
> Current design: [../../authorization-guide.md](../../authorization-guide.md). Role administration
> (CAP-02) is unchanged apart from the `isSystem` check. Re-run `rebuild-spec` to regenerate this file.

## 1. Overview

**Problem:** An admin needs a way to decide which roles may call which API routes, and to keep
that access list from drifting out of sync as new routes get added to the system over time —
hand-maintaining a static access list would go stale the moment a route is added or removed.
**Solution:** Two paired administration APIs — one for the raw per-route permission rows, one for
the roles that hold them — let an admin inspect and hand-edit the access matrix directly. Two
one-shot maintenance scripts keep that matrix honest: one regenerates the permission rows from
whatever routes are actually live in the running app, the other seeds the three bootstrap roles
and the very first admin account on a fresh environment.
**Scope:** View/create/update/delete permission rows; view/create/update/delete roles (the 3
seeded roles are locked against edit and delete); the two maintenance scripts that keep this data
correct.
**Non-Scope:** Assigning a role to an individual user account (that lives in user management);
any per-method restriction narrower than "the whole URL-prefix module" (no such finer control
exists today — see § 3 Open Decisions D001); building or editing the routes themselves.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | The only role permitted to reach any endpoint in this feature | Keep the system's access-control matrix (who can call what) accurate and safe as the API evolves |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Permission Row Administration | View, create, edit, and delete the raw per-route permission rows | US040, US041, US042, US043, US044 | FR-201, FR-202, FR-203, FR-204, FR-205, FR-401, FR-601 | BR-001, BR-003 | N/A |
| CAP-02 | Role Administration | View, create, edit, and delete roles; the 3 seeded roles (admin/client/seller) are locked against edit and delete | US060, US061, US062, US063, US064 | FR-301, FR-302, FR-303, FR-304, FR-305, FR-402, FR-602 | BR-002, BR-004, SM-001 | N/A |
| CAP-03 | Permission Set & Role Grant Maintenance | Regenerate permission rows from the live route table and reassign each role's grant by URL-prefix module; one-shot seed the 3 roles and the first admin account on a fresh environment | N/A — background scripts, no direct user story | FR-001, FR-002 | N/A — see ALG-001/ALG-002 in technical-spec.md § 4.5 | N/A |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Should `client` and `seller` keep full write access (create/edit/delete) to every route in a module they're granted, purely because the role→module allowlist works at module granularity and never checks HTTP method? | Ship as-is — keep module-level grants | No code or comment indicates per-method restriction was ever intended; changing this needs a wider permission-model redesign, not a quick fix | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** The permission rows a role is checked against are derived from whichever routes are actually registered in the running app, not typed in by hand from a static list.
- **FR-002** Each role's granted permission set is computed by matching whole URL-prefix modules to that role, then replacing that role's entire permission list with the match.

### Permission Row Administration (2xx)

- **FR-201** An admin can list all permission rows, paginated.
- **FR-202** An admin can view one permission row's full detail (path, method, module, assigned roles), or a not-found response if it doesn't exist.
- **FR-203** An admin can create a new permission row for a path + method pair, optionally assigning it to one or more roles right away.
- **FR-204** An admin can edit an existing permission row's name, description, path, or method, and replace its assigned-roles list.
- **FR-205** An admin can remove a permission row — recoverable by default (soft delete), or permanently when explicitly requested (hard delete).

### Role Administration (3xx)

- **FR-301** An admin can list all roles, paginated, including the 3 seeded ones.
- **FR-302** An admin can view one role's full detail, including its currently assigned permission rows, or a not-found response if it doesn't exist.
- **FR-303** An admin can create a new custom role, optionally granting it an initial set of permission rows.
- **FR-304** An admin can rename or edit a custom role and replace its permission-grant list. This is rejected for the 3 seeded roles.
- **FR-305** An admin can remove a custom role — recoverable by default, or permanent when explicitly requested. This is rejected for the 3 seeded roles.

### Interaction (4xx)

- **FR-401** Editing a permission row's assigned-roles list replaces the whole list with what was submitted — anything left off is unassigned.
- **FR-402** Editing a role's assigned-permissions list replaces the whole list with what was submitted — anything left off is unassigned.

### Security (6xx)

- **FR-601** Only a caller whose role holds a permission row for the exact route and HTTP method being called may reach any permission-administration endpoint.
- **FR-602** Editing or deleting one of the 3 seeded roles (admin, client, seller) is always rejected, regardless of who the caller is.

## 5. Business Rules

- A new permission row's module label is auto-derived from its path's first segment (e.g. `/users` → `USERS`); editing an existing row's path does NOT recompute that label. (BR-001)
- The 3 seeded roles (admin, client, seller) can never be renamed, re-permissioned, or deleted through these endpoints — only custom roles created afterward are mutable. (BR-002)
- Editing a permission row's assigned roles, or a role's assigned permissions, always replaces the entire list with what was submitted rather than merging into it. (BR-003)
- Any permission ID or role ID submitted for an assignment must exist and must not already be soft-deleted, or the whole request is rejected. (BR-004)
- A role can be Active, Inactive, or (soft-)Deleted; only an Active, non-deleted role is ever returned or checked for access-control purposes. (SM-001)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — no UI
layer exists in this repository and `docs/generated/screen-list.md` is an explicit "No data"
artifact, so no `SCR###` code exists to cite. Traceability runs through the owning routes
instead: ROUTE041-045 (`/permissions`) and ROUTE061-065 (`/roles`).

## 7. User Stories

### US040_ViewPermissionList — View Permission List

**Actor:** Admin
**Goal:** See every permission row that currently exists.
**Business value:** Lets an admin audit exactly what access exists before granting or revoking anything.

**Acceptance Criteria:**
- [ ] Returns all non-deleted permission rows, paginated, each with path/method/module.

### US041_ViewPermissionDetail — View Permission Detail

**Actor:** Admin
**Goal:** Inspect one permission row in full.
**Business value:** Confirms exactly what a specific permission row grants before relying on it.

**Acceptance Criteria:**
- [ ] Returns the row matching the given ID, including its assigned roles.
- [ ] Returns a not-found response if the ID doesn't match any non-deleted row.

### US042_CreatePermission — Create Permission

**Actor:** Admin
**Goal:** Add a new permission row so a role can be granted access to a route.
**Business value:** Lets access be opened up for a route that isn't yet covered, or ahead of the next maintenance-script run.

**Acceptance Criteria:**
- [ ] Creates a new permission row with the submitted path/method/module and optional role assignments.
- [ ] `[UNVERIFIED]` A hand-created row may be deleted the next time the CAP-03 sync script runs, if its (path, method) no longer matches a live route.

### US043_UpdatePermission — Update Permission

**Actor:** Admin
**Goal:** Correct a permission row's details or its role assignments.
**Business value:** Keeps the access matrix accurate after a mistake or a deliberate access change.

**Acceptance Criteria:**
- [ ] Updates the row matching the given ID.
- [ ] The submitted roles list fully replaces the row's existing role assignments.

### US044_DeletePermission — Delete Permission

**Actor:** Admin
**Goal:** Remove a permission row so a role loses access to that route.
**Business value:** Revokes access to a specific route without touching the role or any other permission row.

**Acceptance Criteria:**
- [ ] Removes the row matching the given ID (recoverable by default, permanent if hard-delete requested).

### US060_ViewRoleList — View Role List

**Actor:** Admin
**Goal:** See every role that exists in the system.
**Business value:** Confirms what roles are available before assigning one to a user or editing its grants.

**Acceptance Criteria:**
- [ ] Returns all non-deleted roles, paginated, including the 3 seeded ones.

### US061_ViewRoleDetail — View Role Detail

**Actor:** Admin
**Goal:** Inspect a single role's assigned permissions.
**Business value:** Confirms exactly what a role can do before assigning it or auditing it.

**Acceptance Criteria:**
- [ ] Returns the role matching the given ID, including its assigned permission rows.
- [ ] Returns a not-found response if the ID doesn't match any non-deleted role.

### US062_CreateRole — Create Role

**Actor:** Admin
**Goal:** Create a new custom role with a distinct permission set.
**Business value:** Lets the admin introduce a permission profile narrower or wider than the 3 seeded roles, without touching them.

**Acceptance Criteria:**
- [ ] Creates a new role row, optionally with an initial set of permissions.
- [ ] Creation is never blocked by the seeded-role lock — that lock only applies to update/delete.

### US063_UpdateRole — Update Role

**Actor:** Admin
**Goal:** Change a custom role's name, description, active flag, or permission set.
**Business value:** Lets access profiles evolve as the system's routes and business needs change.

**Acceptance Criteria:**
- [ ] Updates the role matching the given ID and replaces its permission list with what was submitted.
- [ ] Rejected with a forbidden response if the target role's name is `admin`, `client`, or `seller`.

### US064_DeleteRole — Delete Role

**Actor:** Admin
**Goal:** Remove a custom role that's no longer needed.
**Business value:** Keeps the role list free of unused or retired permission profiles.

**Acceptance Criteria:**
- [ ] Removes the role matching the given ID (recoverable by default, permanent if hard-delete requested).
- [ ] Rejected with a forbidden response if the target role's name is `admin`, `client`, or `seller`.

## 8. Scenarios

### US040_ViewPermissionList — Happy Path

**Given** an admin with a valid session, **When** they request the permission list, **Then** they see every non-deleted permission row, paginated.

### US040_ViewPermissionList — Error: unauthenticated caller

**Given** a caller with no valid session or a role without the matching permission row, **When** they request the permission list, **Then** they receive an access-denied response and see no data.

### US041_ViewPermissionDetail — Happy Path

**Given** an admin and a permission ID that exists, **When** they request that permission's detail, **Then** they see its full detail including its assigned roles.

### US041_ViewPermissionDetail — Error: unknown ID

**Given** an admin and a permission ID that doesn't match any non-deleted row, **When** they request its detail, **Then** they receive a not-found response.

### US042_CreatePermission — Happy Path

**Given** an admin submitting a new path/method pair, **When** they create the permission, **Then** a new row is created with its module auto-derived from the path.

### US042_CreatePermission — Error: invalid role assignment

**Given** an admin submitting a role ID that doesn't exist, **When** they create the permission, **Then** the request is rejected and nothing is created.

### US043_UpdatePermission — Happy Path

**Given** an admin and an existing permission, **When** they submit updated details and a new roles list, **Then** the row is updated and its role assignments fully replaced.

### US043_UpdatePermission — Error: unknown ID

**Given** an admin and a permission ID that doesn't match any non-deleted row, **When** they submit an update, **Then** they receive a not-found response.

### US044_DeletePermission — Happy Path

**Given** an admin and an existing permission, **When** they delete it without requesting a hard delete, **Then** the row is soft-deleted and excluded from all future reads.

### US044_DeletePermission — Error: already deleted

**Given** an admin and a permission ID that is already soft-deleted or never existed, **When** they attempt to delete it, **Then** they receive a not-found response.

### US060_ViewRoleList — Happy Path

**Given** an admin, **When** they request the role list, **Then** they see every non-deleted role, including the 3 seeded ones.

### US060_ViewRoleList — Error: unauthenticated caller

**Given** a caller without the matching permission row, **When** they request the role list, **Then** they receive an access-denied response.

### US061_ViewRoleDetail — Happy Path

**Given** an admin and a role ID that exists, **When** they request its detail, **Then** they see the role's data and its currently assigned permissions.

### US061_ViewRoleDetail — Error: unknown ID

**Given** an admin and a role ID that doesn't match any non-deleted role, **When** they request its detail, **Then** they receive a not-found response.

### US062_CreateRole — Happy Path

**Given** an admin submitting a name and an optional permission list, **When** they create the role, **Then** a new role is created, unaffected by the seeded-role lock.

### US062_CreateRole — Error: invalid permission assignment

**Given** an admin submitting a permission ID that doesn't exist, **When** they create the role, **Then** the request is rejected and nothing is created.

### US063_UpdateRole — Happy Path

**Given** an admin and a custom role, **When** they submit updated details, **Then** the role is updated and its permission list fully replaced.

### US063_UpdateRole — Error: target is a seeded role

**Given** an admin targeting the `admin`, `client`, or `seller` role, **When** they submit an update, **Then** the request is rejected with a forbidden response and nothing changes.

### US064_DeleteRole — Happy Path

**Given** an admin and a custom role, **When** they delete it without requesting a hard delete, **Then** the role is soft-deleted and excluded from all future reads and access checks.

### US064_DeleteRole — Error: target is a seeded role

**Given** an admin targeting the `admin`, `client`, or `seller` role, **When** they attempt to delete it, **Then** the request is rejected with a forbidden response and nothing changes.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Admin submits a permission or role ID list that includes one non-existent or soft-deleted ID | The whole create/update request is rejected — nothing is partially applied | "Invalid permissions provided." / "Invalid roles provided." |
| Admin edits a permission's `path` without expecting the `module` label to change | The stored module label stays exactly what it was on creation, even though the path changed | No error shown — the mismatch is silent (see § 11 RISK-01) |
| Admin targets `admin`, `client`, or `seller` with an update or delete request | Request is rejected before any change is made | "You cannot modify this role." |
| Two admins edit the same permission's role list at the same time | The second write to finish wins — the assignment list is fully replaced, not merged, so the earlier admin's change is silently overwritten | No conflict warning shown |
| The CAP-03 sync script runs while a hand-created permission row's route is no longer live | That row is deleted, even if an admin created it moments earlier | No message — this happens outside any API request |

## 10. Edge Behaviours to Verify

- **FR-204** → Confirm that editing only a permission's `path` leaves its stored `module` unchanged.
- **FR-304** → Confirm updating `admin`, `client`, or `seller` is rejected before any DB write happens.
- **FR-401** → Confirm submitting an empty roles list on a permission update clears all its role assignments.
- **FR-601** → Confirm a valid `Bearer` session whose role lacks a matching permission row for the route still gets an access-denied response.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Editing a permission row's `path` does not recompute its `module` label — the stored module can drift from the actual path after an edit. | The role→module allowlist (CAP-03) can silently keep granting or withholding access based on a stale module label. | `[UNVERIFIED]` |
| RISK-02 | known-issue | The permission `method` field's database enum has 7 values (adds OPTIONS and HEAD), but every code path that writes a permission row validates against a 5-value list — OPTIONS/HEAD rows can never actually be created. | 2 of the 7 documented method values are permanently unreachable; not a functional bug today, but a discrepancy between the schema and what the API can produce. | `[INFERRED]` |
| RISK-03 | risk | No automatic trigger (deploy hook, CI/CD step, app startup) was found for the permission-sync maintenance script. | If nobody remembers to re-run it after adding/removing routes, the live permission table silently drifts out of sync with the real API surface. | `[UNVERIFIED]` |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Authentication | feature | Issues the `Bearer` access token whose payload carries the caller's role, which every permission/role endpoint's access check depends on | FR-601 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature. (The admin-bootstrap env vars used by CAP-03's seed script are technical/ops configuration — see `technical-spec.md § 4.6`.)
