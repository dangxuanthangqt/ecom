# System Overview

**Project**: ecom (E-commerce project API) — `package.json:2-3`
**Generated**: 2026-09-12
**Architecture Type**: Modular monolith — headless REST API (NestJS layered modules: Controller → Service → Repository/Prisma), no frontend, no microservices split.

## Executive Summary

`ecom` is a headless e-commerce backend built on NestJS 11 + Prisma 6 + PostgreSQL 15 (`package.json:41-69`, `prisma/schema.prisma:9-12`, `docker-compose.yml:6`). It exposes a REST API only — there is no UI, no template rendering, no `.tsx`/`.vue`/`.html` view layer anywhere in the tree (`plans/260912-0113-rebuild-spec/artifacts/scout-report.md:263`). Fourteen `@Controller()` route modules cover auth, catalog (product/brand/category + i18n translations), media upload, RBAC (role/permission), user profile, and language management (`src/routes/route.module.ts:17-33`).

The data model (`prisma/schema.prisma`, 21 model blocks) is broader than the exposed API surface: `Order`, `Review`, `CartItem`, `Message`, `PaymentTransaction`, and `Device` all have Prisma models and relations but **no** corresponding `@Controller()` under `src/routes/**` — cart/checkout/order/review/messaging are modeled in the schema but not yet wired to routes. [UNVERIFIED — could not confirm whether these are planned-but-unbuilt or deprecated; no route, no repository, and no service reference them outside `schema.prisma` itself.]

Auth is homegrown JWT (access + rotating refresh token, HS256) plus Google OAuth2 Authorization-Code flow, TOTP-based 2FA, and OTP email verification via Resend (`src/shared/services/token.service.ts:25-49`, `src/routes/auth/google.service.ts`, `docs/google-oauth-login-flow.md`). Authorization is RBAC: `Role` ↔ `Permission` (path+method pairs) resolved per-request against the caller's JWT `roleId` (`src/shared/guards/access-token.guard.ts:56-99`, `prisma/schema.prisma:182-225`). Three seed roles exist: `admin`, `client`, `seller` (`src/constants/role.constant.ts:2-6`).

Media is stored in AWS S3 (`src/shared/services/s3.service.ts`); i18n strings live in `nestjs-i18n` JSON catalogs (`src/i18n/en/`, `src/i18n/vn/`) rather than in code. Deployment is a 3-stage Docker build (deps → build → slim `node:24.14.1-alpine` runtime) driven by `docker-compose.yml`, with Postgres as a co-located service. CI runs via `.github/workflows/ci.yml` with pnpm/Prisma setup actions (`.github/actions/pnpm-install/`, `.github/actions/prisma-setup/`).

For per-feature detail, permission mapping, and the full data model, see `feature-list.md`, `permissions.md`, and `data-model.md` once those artifacts land in this same directory.

## Key Design Decisions

### Decision 1: Zod-first validation/serialization over class-validator DTOs, run in parallel

**Context**: The codebase carries two validation stacks simultaneously — `class-validator`/`class-transformer` DTOs (`src/dtos/**/*.dto.ts`, e.g. `src/dtos/user/user.dto.ts`) driven by a global Nest `ValidationPipe` (`src/main.ts:31-44`), and `nestjs-zod`'s `ZodValidationPipe`/`ZodSerializerInterceptor` registered globally as `APP_PIPE`/`APP_INTERCEPTOR` (`src/shared/modules/base.module.ts:55-63`, commented `/** Testing with zod */`).

**Decision**: Zod is the actively-developed path (`src/dtos/product/product.validation.ts`, Google OAuth `state` validated with zod in `google.service.ts`); class-validator DTOs remain wired for Swagger typing and the legacy global pipe.

**Rationale**: [UNVERIFIED] — no ADR or comment states the migration plan explicitly; the `base.module.ts:70` comment "Testing with zod" plus zod's newer date-stamped usage in auth/product code suggests an in-flight migration off class-validator, not a permanent dual-stack. Both are currently live and must both be treated as authoritative when reading DTOs.

### Decision 2: Homegrown RBAC via per-route Permission rows, not a fixed role→scope map

**Context**: Every request under global `AuthorizationHeaderGuard` (`APP_GUARD`, `src/shared/modules/base.module.ts:39-43`) is checked against a `Permission` table keyed by exact `(path, method)` pairs, joined to `Role`, joined to `User.roleId` (`prisma/schema.prisma:182-225`, `access-token.guard.ts:56-99`).

**Decision**: Authorization is data-driven (DB rows), not code-declared (`@Roles()` decorator + enum check), and permissions are seeded via a standalone script rather than migrations (`initial-scripts/create-permission.ts`, `README.md:33-44`).

**Rationale**: Lets ops add/revoke permissions per-route without a redeploy; trade-off is an extra `role.findUniqueOrThrow` DB round-trip on every authenticated request (`access-token.guard.ts:65-81`) and a seed script that must be re-run whenever a new route is added — no CI check enforces that a new controller route has a matching seeded `Permission` row. [INFERRED from guard + seed script code; no doc states this trade-off directly.]

## Security Overview

- **Authentication**: Stateless JWT, HS256, two-token model — access token (5 min default, `ACCESS_TOKEN_EXPIRES_IN`) not persisted, refresh token (1 day default, `REFRESH_TOKEN_EXPIRES_IN`) persisted in `RefreshToken` table and rotated (one-time use, soft-deleted after use) (`token.service.ts:25-49`, `prisma/schema.prisma:169-180`, `docs/google-oauth-login-flow.md` §4.3). Supplementary flows: TOTP 2FA (`src/shared/services/2fa.service.ts`, `otpauth` dep), email OTP via Resend for register/forgot-password/login/disable-2FA (`prisma/schema.prisma:542-547`, `VerificationCodeType` enum), and Google OAuth2 Authorization-Code flow with server-side token exchange (`src/routes/auth/google.service.ts`).
- **Authorization**: RBAC, DB-backed, per-route `(path, method)` Permission rows resolved against the caller's `roleId` on every request (`access-token.guard.ts:56-99`); `AuthorizationHeaderGuard` supports BEARER / API_KEY / NONE per-handler via reflected metadata with AND/OR combination (`authorization-header.guard.ts:25-81`).
- **Data Encryption**: Passwords hashed with bcrypt, 10 salt rounds (`hashing.service.ts:4-12`). JWT secrets and the static API key are plain environment strings with **no rotation or KMS integration** (`env.validation.ts:27-40`). No field-level encryption-at-rest observed in the schema (TLS/at-rest encryption, if any, is a Postgres/infra-layer concern outside this codebase — [UNVERIFIED]).
- **API Security**: Global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`) plus a parallel Zod validation pipe (`main.ts:31-44`, `base.module.ts:55-58`). CORS is hardcoded to a single origin `http://localhost:3000` with no env override (`main.ts:24-29`) — **will silently block/allow only that origin in every environment including production** unless changed before deploy. No rate-limiting or `@nestjs/throttler` dependency found in `package.json`. No global API prefix (`docs/google-oauth-login-flow.md:419`).

**Named, code-confirmed security risks** (evidenced in `docs/google-oauth-login-flow.md` §7, written by the project's own developers against this exact codebase — high-confidence, first-party source):
1. `ApiKeyGuard` compares the `SECRET_API_KEY` header against a **hardcoded literal `"secretApiKey"`**, not the configured env value — the `appConfigService.get("SECRET_API_KEY")` line is present but commented out (`src/shared/guards/api-key.guard.ts:20-27`). The API-key auth path is effectively non-functional/bypassable as configured.
2. Users created via Google login get a **shared hardcoded password** `"changeme"` (hashed), letting an attacker who knows/guesses a Google-linked email log in via `POST /auth/login` bypassing Google entirely (`google.service.ts:16,124`, `docs/google-oauth-login-flow.md` §7.1).
3. OAuth `state` param is unsigned base64 JSON — no CSRF protection on the OAuth callback (`docs/google-oauth-login-flow.md` §7.2).
4. Access/refresh tokens are returned via redirect **query string** on Google OAuth callback, exposing them to browser history, proxy access logs, and `Referer` leakage (`docs/google-oauth-login-flow.md` §7.4, §5b).
5. `.env.example` ships weak example secrets (`ACCESS_TOKEN_SECRET=crud_dxt`) that read like the actual dev defaults — must be rotated before any real deployment (`.env.example:4,6,8`).

## Scalability

- **Current Capacity**: Single-instance Docker Compose stack — one `app` container, one `db` container, no load balancer, no read replica, no cache layer (Redis, etc.) in `docker-compose.yml` or `package.json` dependencies. Not designed for horizontal scale-out as configured. [INFERRED from the absence of any cache/queue dependency and single-service compose file.]
- **Scaling Strategy**: [UNVERIFIED] — no autoscaling config, no k8s manifests, no queue/worker infrastructure found (scout report confirms zero `queue-worker`/`scheduled-job` background-logic hits). Horizontal scaling of the `app` container behind an external LB is architecturally possible (stateless JWT auth, no in-memory session state) but not configured in this repo.
- **Performance Targets**: [UNVERIFIED] — no SLA, latency target, or load-test artifact found in the repository.
