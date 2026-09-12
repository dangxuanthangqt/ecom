---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F009_OwnProfileManagement

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F009 → N/A (headless, no screens) → US057, US058, US059 → N/A (no background logic) → ROUTE058, ROUTE059, ROUTE060 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A logged-in caller (client, seller, or admin) needs to see their own account details, keep them current, and rotate their password without an administrator's involvement.
**Solution:** Three self-service actions — view own profile, update own profile fields, change own password — all scoped to the caller identified from their own session token, never a target user id.
**Scope:** Viewing the caller's own account record (with role and permissions), editing the caller's own name/phone/avatar/status/role fields, and changing the caller's own password with forced logout from all other devices.
**Non-Scope:** Managing another user's account (that is `F010_UserAccountAdministration`); establishing or refreshing the session itself, OTP, Google login, or 2FA toggling (that is `F001_Authentication`); this feature has no screens or client-side code — this is a headless backend API.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Client | A registered shopper | View/update their own account details and rotate their password |
| Seller | A seller-role account holder | Same self-service actions as any other authenticated caller |
| Admin | An admin-role account holder | Same self-service actions as any other authenticated caller — F009 never distinguishes by role beyond requiring authentication |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | View Own Profile | See their own account details, including role and permissions | US057 | FR-001, FR-101, FR-201, FR-601 | — | N/A |
| CAP-02 | Update Own Profile | Change their own name, phone number, avatar, status, or role | US058 | FR-202, FR-203, FR-602 | BR-003, BR-004 | N/A |
| CAP-03 | Change Own Password | Rotate their own password, which logs them out everywhere else | US059 | FR-204, FR-205 | BR-001, BR-002 | N/A |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Should the self-service `PUT /profile` action be allowed to set `status` and `roleId` on the caller's own account, or should those two fields be admin-only? | Restrict `status` and `roleId` to the admin-managed update path (`F010`) and drop them from the self-service update; self-service keeps name/phone/avatar only. | Today any authenticated caller can set their own `status` or `roleId` to any value they can supply — including another role's id — with no ownership or hierarchy check. Recorded as-observed in RISK-01/RISK-02 below; this row is the business call on whether that is intended. | yes |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every profile action requires a valid `Bearer` session; there is no anonymous access to any of the 3 routes in this feature.

### Navigation (1xx)

- **FR-101** The caller is identified from their own session token — no request in this feature accepts a target user id.

### Profile (2xx)

- **FR-201** Viewing the profile returns the caller's full account record, including their role and that role's permissions.
- **FR-202** Updating the profile accepts any subset of name, phone number, avatar, status, or role — only the fields supplied are changed.
- **FR-203** `[UNVERIFIED]` Updating the profile does not restrict which `status` or `role` value the caller may set on their own account — see RISK-01/RISK-02 and Open Decision D001.
- **FR-204** Changing the password requires the caller's current password and a matching new-password confirmation.
- **FR-205** Successfully changing the password logs the caller out of every other device and session.

### Security (6xx)

- **FR-601** All three roles (client, seller, admin) reach the same 3 actions identically — no role receives extra self-service capability here.
- **FR-602** `[UNVERIFIED]` No check limits a caller's own-profile update to a role at or below their current privilege level.

## 5. Business Rules

- The caller's own current password must match the stored password hash before a new password is accepted. (BR-001)
- Changing the password revokes every refresh token and deactivates every device recorded for that user, forcing re-authentication everywhere else. (BR-002)
- Every profile update records the caller themselves as the one who made the change. (BR-003)
- Profile update fields are all optional; a field omitted from the request is left unchanged. (BR-004)

## 6. Screens

N/A — background feature; no user-facing screens (headless backend API — see `F001` for the shared "no screens" scope note; this feature exposes 3 routes, no views).

### User Journey

1. An authenticated caller calls the view action and sees their own account details, role, and permissions.
2. The caller calls the update action with any subset of fields and sees their changed profile reflected back.
3. The caller calls the change-password action with their current and new password; on success, every other device/session they were logged in on is signed out.

## 7. User Stories

### US057 — View Own Profile

**Actor:** Client (applies identically to Seller and Admin)
**Goal:** See my own account details.
**Business value:** Lets a caller confirm their own account state without asking an admin.

**Acceptance Criteria:**
- [ ] The response is the caller's own profile, identified from their `Bearer` token — no id parameter is accepted.
- [ ] The response includes the caller's role and that role's permissions.

### US058 — Update Own Profile

**Actor:** Client (applies identically to Seller and Admin)
**Goal:** Keep my own account details current.
**Business value:** Lets a caller self-serve routine detail changes (name, phone, avatar) without admin involvement.

**Acceptance Criteria:**
- [ ] Only the caller's own account is ever changed — no cross-user update path exists on this route.
- [ ] Supplying only some fields leaves the rest of the profile unchanged.

### US059 — Change Own Password

**Actor:** Client (applies identically to Seller and Admin)
**Goal:** Rotate my own credentials.
**Business value:** Lets a caller secure their account (e.g. after a suspected compromise) without admin involvement.

**Acceptance Criteria:**
- [ ] The change is rejected if the supplied current password does not match.
- [ ] On success, the caller is signed out of every other device.

## 8. Scenarios

### US057 — Happy Path

**Given** a caller with a valid `Bearer` session, **When** they request their own profile, **Then** they see their name, email, phone, avatar, status, role, and that role's permissions.

### US057 — Error: expired session

**Given** a caller whose access token has expired, **When** they request their own profile, **Then** the request is rejected and they must sign in again.

### US058 — Happy Path

**Given** a caller with a valid `Bearer` session, **When** they submit a new phone number only, **Then** their phone number changes and every other field stays the same.

### US058 — Error: soft-deleted account

**Given** a caller whose account was soft-deleted after their token was issued, **When** they attempt to update their profile, **Then** the request is rejected as not found.

### US059 — Happy Path

**Given** a caller who knows their current password, **When** they submit a matching current password and a new password with matching confirmation, **Then** the password changes and they are signed out of every other device.

### US059 — Error: wrong current password

**Given** a caller who supplies the wrong current password, **When** they attempt to change their password, **Then** the request is rejected and the password is not changed.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Current password does not match on change-password | The password is not changed; no tokens are revoked | "Current password is incorrect." |
| New password and confirmation do not match | The request is rejected before any database change | "newConfirmPassword must match newPassword." |
| Caller's account was soft-deleted after their token was issued | Any of the 3 actions is rejected | "User not found." |
| Caller sets their own `status` to `BLOCKED` or `INACTIVE` via profile update | The value is written with no additional check — the account is not immediately signed out, since neither the guard nor these routes check `status` | None — silent success; see RISK-02 |
| Caller sets their own `roleId` to a role other than their current one | The value is written with no ownership/hierarchy check as long as the id refers to a real, non-deleted role | None — silent success; see RISK-01 |

## 10. Edge Behaviours to Verify

- **FR-204** → Confirm that supplying an incorrect current password never changes the stored password and never revokes any token.
- **FR-205** → Confirm that a successful password change revokes every refresh token and deactivates every device for that user, not just the current one.
- **FR-202** → Confirm that omitting a field from the update request leaves that field's stored value unchanged.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `PUT /profile` accepts a `roleId` field with only a UUID-format + foreign-key-exists check — no rule restricts a caller to their own current role or a lower one. | A client or seller who supplies another role's id (e.g. the admin role's id) can self-promote to that role. | confirmed |
| RISK-02 | known-issue | `PUT /profile` accepts a `status` field with only an enum-membership check — no rule prevents a caller from setting their own status, and no route in this feature (nor the shared access-token guard) checks `User.status` before granting access. | A caller can set their own account to `BLOCKED`/`INACTIVE` with no functional effect until their token naturally expires; equally, this path cannot be used by an admin-equivalent process to self-lock an account reliably. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_Authentication | feature | Supplies the `Bearer` access token this feature's caller identity (`ActiveUser`) is read from; F009 does no session establishment of its own. | FR-001 |
| F010_UserAccountAdministration | feature | Shares the same `User` model and the `roleId`/`status` fields RISK-01/RISK-02 concern — an admin acting on another user's account is the sanctioned path for the same fields F009 exposes without restriction. | RISK-01, RISK-02 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
