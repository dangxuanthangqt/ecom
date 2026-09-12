---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->

# Functional Spec — F010_UserAccountAdministration

**Priority**: P2
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F010 → N/A (headless) → US065,US066,US067,US068,US069 → N/A (no BL) → ROUTE066,ROUTE067,ROUTE068,ROUTE069,ROUTE070 → N/A (no TC### yet)

## 1. Overview

**Problem:** An admin needs to manage OTHER people's accounts directly — onboard a user without
self-registration, inspect any account, correct their details, promote a trusted client to
seller/admin, and remove an account — none of which the self-service login/profile features
(F001, F009) expose.
**Solution:** A fixed set of 5 admin-only endpoints (list, detail, create, update, delete) acting
on the `User` entity on behalf of the admin, distinct from a caller managing their own session
(F001) or their own profile (F009).
**Scope:** List all users; view any single user's detail; create a user with a caller-chosen role;
update any user's fields including their role (the only path in the system that promotes a
`client` to `seller`/`admin`); soft-delete any user.
**Non-Scope:** Self-service registration/login/profile editing (F001/F009); Role/Permission CRUD
(a separate admin surface, US060–US064, not part of F010); enforcing the `status` field an admin
sets here at login time — see § 11 Risks & Known Issues.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | The only role whose permission set includes the USERS module | Administer the population of user accounts on others' behalf |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Browse & Inspect Users | List all accounts (paginated) and view one account's full detail including role/permissions | US065, US066 | FR-001, FR-201, FR-202 | BR-001 | N/A (headless) |
| CAP-02 | Create User | Directly onboard a new account with a caller-chosen role | US067 | FR-203 | BR-002, BR-003 | N/A (headless) |
| CAP-03 | Update & Promote Role | Edit any user's fields; the only path that promotes a client to seller/admin | US068 | FR-204, FR-601 | BR-004, BR-005, BR-006 | N/A (headless) |
| CAP-04 | Delete User | Soft-remove an account while preserving its historical FKs | US069 | FR-205, FR-602 | BR-007, BR-008, BR-009 | N/A (headless) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Should setting `User.status` to `INACTIVE`/`BLOCKED` here actually block that user's future logins? | Ship as-is (status is stored but not enforced); treat as a known gap, not a blocker | Fixing this crosses into F001 (login flow) — out of scope for a documentation pass | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Only an admin can reach any of these 5 endpoints — the USERS module is granted to no
  other role by default.

### User Account Management (2xx)

- **FR-201** An admin can view a paginated list of all non-deleted user accounts, sorted and
  ordered by a caller-supplied field.
- **FR-202** An admin can view one user's full detail, including their role and that role's
  permission set.
- **FR-203** An admin can create a new user account, optionally choosing that account's role and
  initial status.
- **FR-204** An admin can update any user's editable fields (name, phone, avatar, password,
  status, role), except their own account through this route.
- **FR-205** An admin can remove a user account; the account is soft-deleted, not erased.

### Security (6xx)

- **FR-601** Only an existing admin can create another admin, or promote any user to admin or
  seller — a non-admin caller attempting either is rejected.
- **FR-602** An admin cannot delete another admin unless they are themselves an admin, cannot
  delete a user holding the exact same role as themselves, and cannot delete or update their own
  account through this route.

## 5. Business Rules

- Only an admin's session can reach any `/users` route — no other role's permission set includes
  the USERS module. (BR-001)
- A non-admin caller cannot create a user whose role is admin. (BR-002)
- A newly created user without an explicit role defaults to the client role, same as
  self-registration. (BR-003)
- An admin cannot update their own account through this route. (BR-004)
- A non-admin caller cannot update a user who is currently an admin, and cannot promote any user
  to admin. (BR-005)
- Updating a user's `roleId` here is the only path in the system that elevates a self-registered
  client to seller or admin. (BR-006)
- An admin cannot delete their own account through this route. (BR-007)
- A non-admin caller cannot delete a user who is currently an admin. (BR-008)
- A caller cannot delete a user holding the exact same role as themselves — this also blocks
  admin-deletes-admin unless a stricter check already caught it. (BR-009)

## 6. Screens

N/A — background feature; no user-facing screens.

### User Journey

N/A — headless backend API; the "user journey" is the caller (an admin, via an external client)
invoking the 5 routes below in whatever order their task requires. No UI exists in this repo to
sequence.

## 7. User Stories

### US065_ViewUserList — View User List

**Actor:** Admin
**Goal:** See all user accounts in the system.
**Business value:** Lets an admin survey the account population before acting on any one of them.

**Acceptance Criteria:**
- [ ] Returns all non-deleted `User` rows, paginated.
- [ ] Each row shows the user's role.

### US066_ViewUserDetail — View User Detail

**Actor:** Admin
**Goal:** Inspect one account's full detail.
**Business value:** Lets an admin verify an account's state (role, permissions, status) before
editing or removing it.

**Acceptance Criteria:**
- [ ] Returns the user matching the given ID, including role and that role's permission list.
- [ ] Returns not-found for a deleted or nonexistent ID.

### US067_CreateUser — Create User

**Actor:** Admin
**Goal:** Onboard a new account directly, without the person self-registering.
**Business value:** Lets an admin add staff/seller accounts or create test/support accounts on
demand.

**Acceptance Criteria:**
- [ ] Creates a new user with the given details.
- [ ] The admin may set the new account's role; omitting it defaults to client.
- [ ] A non-admin caller cannot set the new account's role to admin.

### US068_UpdateUserAndPromoteRole — Update User And Promote Role

**Actor:** Admin
**Goal:** Correct a user's details or promote them to a higher-privilege role.
**Business value:** This is the only way a self-registered client becomes a seller or admin —
without it, every account is permanently stuck at client.

**Acceptance Criteria:**
- [ ] Updates the target user's name/phone/avatar/password/status/role as supplied.
- [ ] Rejects the call if the admin targets their own account.
- [ ] Rejects the call if a non-admin caller targets an admin account, or tries to promote anyone
  to admin.

### US069_DeleteUser — Delete User

**Actor:** Admin
**Goal:** Remove an account that should no longer exist in the system.
**Business value:** Lets an admin retire accounts (former staff, spam signups) while the platform
keeps the account's historical trail (e.g. products they created) intact.

**Acceptance Criteria:**
- [ ] The target account is soft-deleted (marked, not erased) and disappears from list/detail.
- [ ] Rejects the call if the admin targets their own account.
- [ ] Rejects the call if a non-admin caller targets an admin account, or if the caller and target
  share the exact same role.

## 8. Scenarios

### US065_ViewUserList — Happy Path

**Given** an admin session, **When** the admin requests the user list, **Then** a paginated page
of non-deleted users is returned, each with its role.

### US065_ViewUserList — Error: Not an admin

**Given** a client or seller session, **When** that caller requests the user list, **Then** the
request is rejected as forbidden before any data is returned.

### US067_CreateUser — Happy Path

**Given** an admin session, **When** the admin submits a new user's details with no role chosen,
**Then** the account is created with the client role.

### US067_CreateUser — Error: Non-admin tries to grant admin role

**Given** a caller whose session somehow reaches this route without being an admin, **When** they
submit a new user with the admin role selected, **Then** the request is rejected as forbidden and
no account is created.

### US068_UpdateUserAndPromoteRole — Happy Path

**Given** an admin session and an existing client user, **When** the admin updates that user's
role to seller, **Then** the user's role changes to seller.

### US068_UpdateUserAndPromoteRole — Error: Admin edits themselves

**Given** an admin session, **When** the admin targets their own user ID on this route, **Then**
the request is rejected as forbidden and nothing changes.

### US069_DeleteUser — Happy Path

**Given** an admin session and a target client account, **When** the admin deletes that account,
**Then** the account is marked deleted and stops appearing in list/detail.

### US069_DeleteUser — Error: Same-role delete

**Given** an admin session, **When** the admin targets another account holding the admin role
(same role as the caller), **Then** the request is rejected as forbidden and the account is
untouched.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Non-admin caller hits any `/users` route | Rejected before any handler logic runs — the caller's role has no USERS-module permission | "You do not have permission to access this resource." |
| Admin targets their own account on update or delete | Rejected regardless of role checks — this route never lets an admin act on themselves | "You cannot update your own user." / equivalent for delete |
| Non-admin somehow reaches create/update with `roleId` set to admin | Rejected — only an existing admin may create or promote to admin | "You are not allowed to create an admin user." / "You are not allowed to update the user to an admin." |
| Admin sets a target user's `status` to BLOCKED or INACTIVE | The value is stored, but nothing else in the system currently checks it — the user can still log in normally | (no message — the update itself succeeds silently with no enforced effect) |
| Detail/update/delete on a nonexistent or already-deleted user ID | Returns not-found | "User not found." |

## 10. Edge Behaviours to Verify

- **FR-001** → Confirm a client or seller session cannot reach any of the 5 `/users` routes.
- **FR-601** → Confirm a non-admin cannot create or promote a user to admin, and cannot act on an
  existing admin account.
- **FR-602** → Confirm an admin cannot delete/update their own account, and cannot delete a
  same-role account, through this route.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `User.status` (ACTIVE/INACTIVE/BLOCKED) is settable by an admin through create/update on this feature, but no code path anywhere in the repository (including login) reads or enforces this field — an admin "suspending" a user by setting BLOCKED has no actual effect on that user's ability to log in or use the API. | An admin who believes they have suspended an account has not — the account keeps full access. | confirmed |
| RISK-02 | risk | Role-escalation prevention for create/update/delete (BR-002/005/008/009) is enforced entirely in `UserService`'s own code, not by the module-level RBAC gate. Because USERS-module access today is granted only to `admin` (PERM005), this is currently redundant defense — but if a future role is ever granted the USERS module, that role would still be blocked from admin-escalation paths only because these explicit checks exist; any other USERS-module action (e.g. viewing/creating/deleting non-admin users) would be available to that role with no further gate. | Any future role grant to the USERS module inherits full list/view/create/delete-non-admin capability by default, tempered only by the admin-specific escalation checks. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_Authentication | feature | Supplies the `Bearer` session and role/permission lookup every `/users` route is gated by | BR-001 |
| Role/Permission seed (admin-only USERS module) | infrastructure | Determines which role can reach this feature at all — set once at seed time, not by this feature | BR-001 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
