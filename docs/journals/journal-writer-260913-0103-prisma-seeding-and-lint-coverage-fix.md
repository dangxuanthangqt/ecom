# Prisma Seed System: Fixed Fixtures + Volume Actor, and an ESLint Coverage Gap That Almost Escaped

**Date**: 2026-09-13 01:03
**Severity**: high
**Component**: Prisma seed architecture, database initialization, ESLint configuration
**Status**: resolved

## What Happened

Implemented a deliberately split seed system alongside the existing `initial-scripts/` bootstrap (roles, admin user, route-derived permissions), which it deliberately does not absorb: a fixture tier (`prisma/seed.ts` + `prisma/seed/`) that wires into `prisma migrate reset` with ~180 hardcoded rows across core (languages, roles, admin) and demo data (products, orders, reviews), and a volume tier (`prisma/seed-volume.ts`) for load testing, seeded separately with faker, batched inserts, and tunable scale flags. Fixed UUIDs in fixtures enable idempotent upserts; volume seed marks all generated data with `createdById = UserId.VOLUME_ACTOR` and `@volume.local` email domain for clean teardown via `--clean`. Both seeders connect to a bare `PrismaClient` — no Nest bootstrap, no Redis/S3/HTTP.

Measured performance: fixture seed ~180 rows in ~380ms; volume seed tuned to ~44k rows (default) in 2.3s, scaling to ~290k at `--products=20000 --orders=50000` in 27s.

## The Brutal Truth

The session felt clean until review came back with a chilling finding: ESLint's global ignores included `"prisma"`, making ~1,600 new lines of real seed logic invisible to lint. The checker passed with a green exit code, but that green was a lie — the linter never saw the code. Worse, every `NODE_ENV` guard in the seed system was backwards: `if (process.env.NODE_ENV === "production") { throw ... }` is a blocklist that lets `staging`, `uat`, and `qa` sail through to `TRUNCATE` tables and plant fixtures with hardcoded UUIDs under a checked-in password. A manual `pnpm db:seed` on staging would have been catastrophic. No actual damage occurred because this never ran against staging, but the fact it nearly left the door open is the sting here.

## Technical Details

**Seed architecture decisions:**

- Fixed UUIDs (`uuid: "550e8400-e29b-..."`) in all fixtures; enables re-run idempotency via upsert (`upsert: { create: {...}, update: {...} }`) and lets e2e/Postman tests hardcode product/order/admin IDs that survive `prisma migrate reset`.
- Volume seed does NOT wrap in a transaction; WAL lock cost outweighs safety for read-only test data. Also not part of `migrate reset` — separate command.
- Shared bcrypt hash across all 10k+ generated users (`$2a$10$...`) to avoid per-row hashing overhead; acceptable because volume accounts exist only in test/load contexts.
- Implicit m2m tables (`_CategoryToProduct`, `_OrderToProduct`) have no Prisma model. Seeded via raw SQL with `Prisma.sql` placeholders, not `$executeRawUnsafe` string interpolation.

**The lint and env guard fixes:**

- ESLint ignore narrowed from global `"prisma"` to `ignores: ["prisma/migrations/**", "prisma/generated/**"]`, exposing 1,600 lines. Fixed 10 real lint errors (import/order, prettier, unused vars) immediately.
- NODE_ENV guards replaced with allowlist in `prisma/seed/seed-environment.ts`. Now only `development` and `test` proceed; `staging`, `uat`, `production` throw hard. Verified: with `NODE_ENV=staging`, both `db:seed --reset` and plain `db:seed` refuse.
- `TRUNCATE ... CASCADE` in `reset.ts` now includes `Message` table (previously omitted, causing hangs when `User` deletion was attempted).

**Measurements and verification:**

- Fixture seed: ~180 rows, ~380ms elapsed.
- Volume seed default: ~44k rows, 2.3s.
- Volume seed peak: `--products=20000 --orders=50000` → ~290k rows, 27s.
- `pnpm test`: 1587 passed, 4 skipped, 0 failed (141 suites), exit 0.
- `pnpm lint`: now includes prisma/seed; 0 errors, 36 warnings (16 are interface-naming, a repo convention).
- SunLint: 0 errors.
- licenseal: 1301 deps, 0 violations.

## What We Tried

Initially considered wrapping the volume seed inside a single transaction for atomicity. Abandoned because WAL lock contention during 27-second multi-table inserts would be a net loss; the data is disposable anyway.

Explored whether Prisma `Client Extension` could enforce soft-delete filtering silently across all queries. Opted against it (same reasoning as the prior session) — a shared constant is more transparent.

## Root Cause Analysis

The ESLint coverage gap stemmed from a valid historical reason: when `prisma/` held only migrations and generated code, ignoring it made sense. Adding ~1,600 lines of real logic without updating the ignore list left that logic invisible to the gate. This is a process gap, not a tool bug — the configuration was just never revisited when the directory's role changed.

The blocklist NODE_ENV guards came from copying a pattern from elsewhere in the codebase without re-reading it for context. Blocklists are dangerous in production gates; allowlists force conscious intent and fail safely by default.

## Lessons Learned

**When adding substantial logic to an ignored directory, audit the ignore list.** A passing lint gate is worthless proof if the directory being added is blacklisted. Check what's actually inside the gate before trusting the result.

**Use allowlist guards for destructive operations, never blocklist.** `if (ALLOWED_ENVS.includes(env)) { proceed }` beats `if (env !== "production") { proceed }` every time. Blocklists are silent-fail traps.

**Verify idempotency with multiple runs.** Run the seed twice in a row against the same database and check counts match. Upserts are easy to botch.

## Next Steps

1. **Audit all Node.js CLI/seed commands** for blocklist NODE_ENV guards. Replace any found with allowlist in a shared constant or dedicated validation module. Owner: any senior engineer, non-blocking, by next sprint.
2. ~~Document seed intent and ownership~~ — done in this session: `docs/database-seeding.md` covers both tiers, the volume-actor teardown and the flag API, and `README.md` links to it.
3. **Block bare `migrate reset` on staging/prod in CI.** A future SQL step should read the active migration branch and refuse reset outside dev/test branches. Owner: DevOps/lead, non-critical but protective.
