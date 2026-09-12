---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F001_Authentication

**Priority**: P0
**Type**: mixed
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F001 → N/A (headless, no screens) → US001-US009 → BL003, BL005 → ROUTE001-ROUTE010 → TC### (not yet generated)

## 1. Overview

**Problem:** A client needs a way to prove who they are, keep proving it over time without
re-entering credentials constantly, and recover access if they forget their password or lose a
second factor — all without another user being able to act on their behalf.
**Solution:** The system issues short-lived access tokens and longer-lived refresh tokens after a
password or Google sign-in, lets a client trade a refresh token for a new access token, revoke a
session, request a one-time code for verification, reset a forgotten password, and toggle
two-factor authentication (2FA) on their own account.
**Scope:** Register a new account, log in with password or Google, refresh/revoke a session,
request an OTP, reset a forgotten password, enable/disable 2FA.
**Non-Scope:** Role/permission administration (F010 owns role assignment and the permission
matrix), user-profile management beyond the fields captured at registration, email delivery
infrastructure itself (only the OTP-generation side is in scope — see § 11 RISK-01 for the current
gap), device/session listing UI (no CRUD route exists for `Device` outside login/logout).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Client | Any registered end user of the storefront (default role granted on signup) | Establish, maintain, and end their own authenticated session, and recover it when locked out |
| Seller / Admin | Same login/logout/2FA/refresh mechanism as Client — no separate auth path | Use the identical session lifecycle as any other account holder |

This feature is part of the Google OAuth login flow documented separately at
`docs/google-oauth-login-flow.md` (cross-checked against source for this spec).

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Register & Verify Identity | Create an account with an emailed-style OTP code, or request that code | US001, US005 | FR-001, FR-002, FR-101, FR-201, FR-202 | BR-001, BR-002, RISK-01, RISK-02 | N/A |
| CAP-02 | Password Session Lifecycle | Log in with a password, refresh an expiring session, log out | US002, US003, US004 | FR-102, FR-203, FR-204, FR-205 | BR-003, BR-004, BR-005, DEC-001, SM-001 | N/A |
| CAP-03 | Google OAuth Login | Sign in with a Google account, new or returning | US006 | FR-103, FR-206 | BR-006, BR-007, DEC-002, RISK-03, RISK-04 | N/A |
| CAP-04 | Password Recovery | Reset a forgotten password using an OTP code | US007 | FR-207 | BR-008 | N/A |
| CAP-05 | Two-Factor Authentication | Turn TOTP-based 2FA on or off for the caller's own account | US008, US009 | FR-601, FR-208, FR-209 | BR-009, BR-010 | N/A |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Is `POST /auth/otp` intentionally not emailing the code today (BL005's `EmailService.sendEmail` call site is commented out), or is this a regression waiting to be re-enabled? | Ship as-is; treat the OTP code as retrievable only via the DB/an internal support path until this is answered | The code path fully works end to end except the actual email send, so this reads more like a paused feature than a crash — but only a stakeholder can confirm intent | yes |
| D002 | Should `User.status` (`ACTIVE`/`INACTIVE`/`BLOCKED`) block login/refresh for non-`ACTIVE` accounts? | Ship as-is (status is not checked anywhere in this feature today) | No code path in F001 reads `status` at all; changing this is a product decision, not a bug fix a researcher should assume | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A new account is always created with the `client` role — there is no way for a caller to request a different role at signup.
- **FR-002** A registration or password-reset OTP is single-use per (email, purpose) pair — requesting a new one for the same email and purpose replaces the previous code.

### Navigation (1xx)

- **FR-101** A prospective user reaches registration by first requesting an OTP for the `REGISTER` purpose, then submitting it with their account details.
- **FR-102** A returning user reaches their session by submitting email + password (optionally with a 2FA code) to the login endpoint.
- **FR-103** A user reaches Google login by requesting an authorization URL, completing consent on Google, and being redirected back through the callback endpoint.

### Registration & OTP (2xx)

- **FR-201** Registering requires a valid, non-expired OTP code previously issued for that email under the `REGISTER` purpose.
- **FR-202** Requesting an OTP for `REGISTER` is rejected if an account with that email already exists; requesting one for `FORGOT_PASSWORD` is rejected if no account exists.

### Password Session (2xx)

- **FR-203** Logging in requires a matching email/password pair; if the account has 2FA enabled, it additionally requires a valid TOTP code or a valid `LOGIN` purpose OTP code.
- **FR-204** A refresh token can be exchanged exactly once for a new access/refresh token pair; the old refresh token is invalidated in the same operation.
- **FR-205** Logging out invalidates the refresh token presented and marks its owning device inactive.

### Google OAuth (2xx)

- **FR-206** Completing Google consent creates a new `client`-role account on first login (with a fixed placeholder local password) or signs in an existing account matched by email.

### Password Recovery (2xx)

- **FR-207** Resetting a forgotten password requires a valid, non-expired `FORGOT_PASSWORD` purpose OTP code for that email.

### Two-Factor Authentication (2xx)

- **FR-208** Enabling 2FA is rejected if the caller's account already has it enabled.
- **FR-209** Disabling 2FA is rejected if the caller's account does not currently have it enabled.

### Security (6xx)

- **FR-601** Every route in this feature except register/login/refresh-token/otp/google-*/forgot-password requires a valid `Bearer` access token; those seven routes (google-* is two routes) are explicitly public.

## 5. Business Rules

- New accounts, whether via registration or Google login, are always assigned the `client` role — no field lets a caller pick another role. (BR-001)
- A registration OTP is deleted the moment the account is successfully created, and a `FORGOT_PASSWORD` OTP is deleted the moment the password is successfully reset — a stale code cannot be replayed for the same purpose. (BR-002)
- If a login's account has 2FA enabled, the caller must supply either a TOTP code or a one-time login code — neither is required when 2FA is off. (BR-003)
- Refresh tokens rotate: using one deletes it and issues a brand-new refresh token, preserving only the token's remaining lifetime rather than resetting the full expiry window. (BR-004)
- Logging in or refreshing updates the caller's `Device` row (IP, user agent) rather than creating a new one on every refresh. (BR-005)
- A first-time Google sign-in is auto-provisioned with a fixed, non-random local password (`"changeme"`, hashed) rather than a random one — this is a recorded security concern, see RISK-03. (BR-006)
- The Google OAuth `state` parameter carries `{userAgent, ip}` so the callback can attach them to the new session's `Device` row, but it is not cryptographically signed — see RISK-04. (BR-007)
- Password confirmation fields (`confirmPassword` on register and forgot-password) must exactly match their paired password field before the request is accepted. (BR-008)
- Enabling 2FA persists a freshly generated TOTP secret only when the account currently has none, acting solely on the caller's own account, never another user's. (BR-009)
- Disabling 2FA clears the TOTP secret only when the account currently has one, acting solely on the caller's own account, never another user's. (BR-010)
- The Google OAuth callback's redirect target differs by outcome: success carries the new access/refresh tokens as query parameters, failure carries a generic error message — never both. (DEC-002)
- Refreshing a token session always replaces the presented refresh token with a new one in the same request; the old token is deleted regardless of whether the new one is later used. (DEC-001)
- A session's refresh token moves from active to rotated when the session is refreshed, or to revoked when the user logs out; once rotated or revoked it can no longer be used again. (SM-001)

## 6. Screens

N/A — background feature; no user-facing screens. Owning routes for traceability: ROUTE001
(register), ROUTE002 (login), ROUTE003 (refresh-token), ROUTE004 (logout), ROUTE005 (otp),
ROUTE006 (google/authorization-url), ROUTE007 (google/callback), ROUTE008 (forgot-password),
ROUTE009 (2fa/enable), ROUTE010 (2fa/disable).

### User Journey

1. A new user calls the OTP endpoint for `REGISTER`, then submits the register endpoint with that
   code — an account is created with the `client` role.
2. A returning user calls the login endpoint with email/password (plus a 2FA code if enabled) and
   receives an access + refresh token pair.
3. When the access token nears expiry, the client exchanges the refresh token for a new pair via
   the refresh endpoint, without asking the user to log in again.
4. The user calls logout, invalidating the current refresh token and deactivating the device.
5. A user who forgot their password calls the OTP endpoint for `FORGOT_PASSWORD`, then submits the
   forgot-password endpoint with that code and a new password.
6. A user chooses Google sign-in instead: the client requests an authorization URL, the user
   consents on Google, and Google's redirect completes the login server-side, handing tokens back
   to the client via redirect query parameters.
7. A logged-in user enables or disables 2FA on their own account at any time.

## 7. User Stories

### US001_RegisterAccount — Register a new account

**Actor:** Client
**Goal:** Create a new account so I can start using the platform.
**Business value:** Turns a visitor into an addressable, authenticated account holder.

**Acceptance Criteria:**
- [ ] Submitting a valid email/password/name/phone plus a matching `REGISTER` OTP creates an
  account with the `client` role.
- [ ] Submitting an email that already has an account returns a conflict-style error, not a
  duplicate account.
- [ ] The submitted `avatar` URL is accepted by validation but is `[UNVERIFIED gap]` never
  actually stored on the account — see RISK-02.

### US002_LogIn — Log in with password

**Actor:** Client
**Goal:** Access my account with my email and password.
**Business value:** The baseline way any account holder resumes a session.

**Acceptance Criteria:**
- [ ] Valid credentials (plus a 2FA code, if enabled) return an access + refresh token pair.
- [ ] An invalid email or password is rejected without confirming which one was wrong to the field
  name shown to the *other* field.

### US003_RefreshAccessToken — Refresh an expiring session

**Actor:** Client
**Goal:** Exchange my refresh token for a new access token without re-entering credentials.
**Business value:** Keeps a session alive across the access token's short lifetime.

**Acceptance Criteria:**
- [ ] A valid, non-deleted refresh token returns a new access + refresh token pair and invalidates
  the old refresh token.
- [ ] An expired or already-used refresh token is rejected.

### US004_LogOut — Log out

**Actor:** Client
**Goal:** End my current session on this device.
**Business value:** Lets a user revoke access from a device they no longer control or trust.

**Acceptance Criteria:**
- [ ] Logging out deletes the presented refresh token and marks its device inactive.
- [ ] Works identically regardless of whether the caller is a client, seller, or admin.

### US005_RequestOtpCode — Request a one-time verification code

**Actor:** Client
**Goal:** Obtain a one-time code to verify my identity for registration, login, password reset, or
disabling 2FA.
**Business value:** Provides the identity-verification step several other stories depend on.

**Acceptance Criteria:**
- [ ] A `VerificationCode` row is created for the requested email and purpose.
- [ ] `[UNVERIFIED gap]` The code is not currently emailed to the user — see RISK-01.

### US006_LogInWithGoogle — Log in with Google

**Actor:** Client
**Goal:** Sign in using my Google account instead of a separate password.
**Business value:** Removes the friction of a dedicated password for this platform.

**Acceptance Criteria:**
- [ ] Requesting the authorization URL returns a Google consent link.
- [ ] Completing consent creates a new `client` account on first login (email-matched) or logs in
  the existing one, and redirects back to the client app with tokens attached.
- [ ] A first-time Google account is given a fixed, non-random local password — see RISK-03.

### US007_ResetForgottenPassword — Reset a forgotten password

**Actor:** Client
**Goal:** Regain access to my account after forgetting my password.
**Business value:** Avoids permanent lockout for a common, low-risk mistake.

**Acceptance Criteria:**
- [ ] A valid `FORGOT_PASSWORD` OTP plus matching new password + confirmation updates the
  account's password.
- [ ] No existing session is required to use this endpoint.

### US008_EnableTwoFactorAuth — Enable 2FA

**Actor:** Client
**Goal:** Add a second factor to protect my account.
**Business value:** Reduces account-takeover risk from a leaked password alone.

**Acceptance Criteria:**
- [ ] Enabling 2FA on an account with none yet returns a TOTP secret and provisioning URI, and
  persists the secret.
- [ ] Enabling 2FA when it is already enabled is rejected.

### US009_DisableTwoFactorAuth — Disable 2FA

**Actor:** Client
**Goal:** Remove the second factor so I can log in with just my password again.
**Business value:** Lets a user recover from a lost authenticator without abandoning the account.

**Acceptance Criteria:**
- [ ] Disabling 2FA when it is enabled clears the secret.
- [ ] Disabling 2FA when it is not enabled is rejected.

## 8. Scenarios

### US001_RegisterAccount — Happy Path

**Given** a valid, unexpired `REGISTER` OTP exists for `newuser@example.com`, **When** the user
submits matching registration details and that code, **Then** an account is created with the
`client` role and the OTP is consumed.

### US001_RegisterAccount — Error: Email already registered

**Given** an account already exists for `existing@example.com`, **When** a new OTP is requested
for that email under `REGISTER`, **Then** the request is rejected with a plain-language "email
already exists" message.

### US002_LogIn — Happy Path

**Given** a registered account with a correct email/password and no 2FA enabled, **When** the user
submits login, **Then** they receive an access token and a refresh token.

### US002_LogIn — Error: Wrong password

**Given** a registered account, **When** the user submits the correct email but an incorrect
password, **Then** the request is rejected with "Password is not valid."

### US003_RefreshAccessToken — Happy Path

**Given** a valid, non-expired refresh token, **When** the user submits it to the refresh
endpoint, **Then** they receive a new access + refresh token pair and the old refresh token no
longer works.

### US003_RefreshAccessToken — Error: Expired refresh token

**Given** an expired refresh token, **When** the user submits it, **Then** the request is
rejected as unauthorized.

### US006_LogInWithGoogle — Happy Path

**Given** a user completes Google consent for the first time, **When** Google redirects to the
callback with a valid code and state, **Then** a new `client` account is created and the client
app receives tokens via redirect.

### US006_LogInWithGoogle — Error: Invalid or expired state

**Given** a tampered or expired `state` parameter, **When** Google redirects to the callback,
**Then** the client app is redirected back with a generic failure message, not a token.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Registering with an OTP that was issued for a different email | The lookup on `(email, code, type)` finds no match | "Verification code is not valid." |
| Two refresh requests race on the same refresh token | The token is deleted on first use; the losing request's lookup fails | "Refresh token not found." |
| Requesting a 2FA-code login without 2FA enabled on the account | No 2FA check runs at all — password alone is sufficient | None — silent normal login |
| Disabling 2FA with neither a TOTP code nor an OTP code supplied | The account's 2FA secret is cleared anyway — no code is required by validation when both fields are simply omitted | None — 2FA is disabled without a second-factor check |
| Google callback where the account's email already belongs to a non-Google account | The existing account is logged into as-is — no separate identity linking step exists | None — treated as a normal login |

## 10. Edge Behaviours to Verify

- **FR-002** → Confirm that requesting a second OTP for the same email/purpose overwrites, rather than duplicates, the first code.
- **FR-204** → Confirm a refresh token cannot be reused after a successful refresh.
- **FR-206** → Confirm a Google callback for an email that already has a password-based account logs into that same account rather than creating a duplicate.
- **FR-601** → Confirm every non-public route in this feature 401s with no `Authorization` header at all.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `POST /auth/otp` creates a `VerificationCode` row but never sends it — the only call site of `EmailService.sendEmail` (in `sendOTP`) is commented out. | A caller has no way to receive their OTP code through this feature alone; register/forgot-password/login-2FA/disable-2FA all depend on a code the user never receives via email. | confirmed |
| RISK-02 | known-issue | `RegisterRequestDto.avatar` is validated (must be a URL if present) but is never written to the created `User` row — `UserInputData` omits it entirely. | A client submitting an avatar at signup silently loses that value; the field looks functional in the API contract but is not. | confirmed |
| RISK-03 | risk | First-time Google sign-in accounts are provisioned with a fixed, shared local password (`"changeme"`, hashed) instead of a random one. | Any Google-provisioned account can theoretically be logged into via the password endpoint using this known value, if the local-password login path is ever exposed for such an account without the caller also owning the Google identity. | confirmed |
| RISK-04 | risk | The Google OAuth `state` parameter is base64-encoded but not signed/HMAC'd — anyone can construct their own valid-shaped state payload. | State cannot be trusted as CSRF protection; it currently carries only `{userAgent, ip}` metadata, so the practical impact today is limited to that metadata being spoofable, not full account takeover. | confirmed |
| RISK-05 | risk | `User.status` (`ACTIVE`/`INACTIVE`/`BLOCKED`) is never read anywhere in this feature's login/refresh/register code paths. | An account marked `INACTIVE` or `BLOCKED` elsewhere in the system can still log in, refresh, and use 2FA through this feature — see Open Decisions D002. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F010 (Role/Permission administration) | feature | Every account this feature creates is assigned the `client` role, and every route in this feature that requires a `Bearer` token is gated by the per-route permission rows F010 manages. | BR-001, FR-601 |
| Google OAuth (external service) | external-service | Google is the identity provider for US006 — the callback cannot complete without Google's token exchange and userinfo endpoints. | BR-006, BR-007 |
| Resend (external service) | external-service | The intended (currently disconnected) delivery channel for OTP codes. | RISK-01 |

## 13. Configuration

```text
OTP_EXPIRES_IN         # how long a requested one-time code stays valid before FR-201/FR-207 reject it
ACCESS_TOKEN_EXPIRES_IN  # how long an issued access token stays valid before a refresh is required
REFRESH_TOKEN_EXPIRES_IN # how long an issued refresh token stays valid before FR-204's rotation is no longer possible
```
