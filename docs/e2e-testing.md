# E2E Testing

Real end-to-end tests: a booted `INestApplication`, a dedicated Postgres database, and real
Redis — no guard bypassing, no mocked Prisma, no in-memory fakes. Every authenticated spec
gets its token by calling `POST /auth/login` for real, so the whole
`AuthorizationHeaderGuard → AccessTokenGuard → RolePermissionCacheService` chain runs exactly
as it does in production.

## Running locally

```bash
docker compose up -d db redis
cp .env.test.example .env.test   # once per checkout; already gitignored
pnpm test:e2e
```

`pnpm test:e2e` runs `pretest:e2e` first (aliased to `pnpm test:e2e:setup`), which resets and
migrates `ecom_e2e`, seeds fixtures, syncs the permission catalogue and system-role grants, and flushes the Redis DB used for
tests — then runs the suite itself via `jest --config ./test/jest-e2e.json --runInBand`.

To debug the setup step on its own, without running the suite:

```bash
pnpm test:e2e:setup
```

If a run appears to hang, add `--detectOpenHandles` to the jest invocation
(`pnpm exec jest --config ./test/jest-e2e.json --runInBand --detectOpenHandles`) to find the
handle keeping the process alive (usually a Prisma or ioredis client a spec forgot to close).

**Do not run two `pnpm test:e2e` invocations concurrently against the same `.env.test`.** The
suite is deliberately serialized (`--runInBand`) against one shared `ecom_e2e` database and one
shared Redis logical DB — a second concurrent invocation resets the same database and flushes
the same cache mid-run, producing cross-process false 403s and flaky failures that have nothing
to do with the code under test. This was raised and checked during the design of this harness;
the fix is procedural (never run it twice at once), not a code change.

## Isolation strategy

| Concern      | Choice                                                                                                                                                                                                                                                                 | Why                                                                                                                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database     | A separate `ecom_e2e` database on the same Postgres instance `docker-compose.yml` already runs, rebuilt with `prisma migrate reset --force --skip-seed` before every run.                                                                                              | No testcontainers, no second compose service — reuses the existing `db` container. `scripts/prepare-e2e-database.sh` refuses to run unless `DATABASE_URL` contains `ecom_e2e`, so a stale or typo'd env can never point the reset at dev/prod data. |
| Redis        | Logical DB 1 (`redis://localhost:6379/1`), `FLUSHDB` before every run.                                                                                                                                                                                                 | The `RolePermissionCacheService` caches each role's permission-key set (`role-permission:{roleId}`); a stale cache entry from a previous run or from local dev (DB 0) is a real cross-run 403 hazard, not a theoretical one.                        |
| Env layering | `.env.test` carries only the e2e overrides (`NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`); everything else falls through from `.env` because `ConfigModule.forRoot` reads `.env.${NODE_ENV}` then `.env`, and dotenv never overwrites an already-set key. | Keeps the override file small and obviously e2e-specific instead of duplicating the whole `.env`.                                                                                                                                                   |

## The auth-via-real-login pattern

No spec constructs a JWT by hand or bypasses a guard. Every authenticated request follows the
same two steps a real client would:

1. `POST /auth/login` with seeded fixture credentials, reading the real `accessToken` /
   `refreshToken` pair back from the response.
2. Replay that `accessToken` as `Authorization: Bearer <token>` on the request under test.

This means a passing spec is proof the full guard chain — header parsing, token verification,
permission resolution (`@RequirePermission` on the handler, the role's key set from Redis or Postgres, the `any`-implies-`own` rule) —
works end to end, not just that a handler's business logic works in isolation.

## What is not covered, and why

| Area                              | Why deferred                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `review`                          | Depends on a delivered order; a follow-up pass once order e2e coverage has proven stable.           |
| `media`                           | Requires real S3 credentials or a stubbed bucket — an infrastructure decision, not a test decision. |
| `GET /auth/google/callback`       | Requires a live Google token exchange.                                                              |
| Concurrent checkout / stock races | `--runInBand` forbids concurrency by design; see `docs/race-conditions-analysis.md`.                |

Their unit suites remain the only coverage for these areas until a follow-up pass picks them up.

`brand`, `brand-translation`, `category`, `category-translation`, `permission`, `role`, `language`
and `profile` are now covered (see `test/e2e/brand/`, `test/e2e/category/`, `test/e2e/permission/`,
`test/e2e/role/`, `test/e2e/language/`, `test/e2e/profile/`). The `permission`/`role` isolation
concern noted in an earlier revision of this doc turned out to be a non-issue in practice: mutating
them calls `RolePermissionCacheService.invalidateAll()`, which only forces the next request to fall
back to Postgres — it never corrupts another spec's assertions, and `--runInBand` guarantees no
other spec's request is in flight while the mutation happens.

## Production-code findings surfaced by this work (not fixed here)

Writing real, unmocked flows against real guards and a real database surfaced six bugs in
existing production code. None were introduced or fixed by the e2e work — they are flagged here
as follow-up tickets, out of this task's scope:

1. **`POST /auth/2fa/disable` succeeds with an empty body.** No code is verified when both
   `totpCode` and `code` are absent from the request — the endpoint should reject the request
   with a validation error instead of disabling 2FA unauthenticated-of-a-second-factor.
2. **A second `POST /auth/logout` with an already-used refresh token returns `500` instead of a
   clean `404`.** `RefreshTokenRepository.delete` does not check
   `isRecordNotFoundPrismaError` before letting the Prisma "record to delete does not exist"
   error propagate.
3. **`POST /auth/refresh-token` with a garbage/unparsable token returns `500` instead of
   `401`/`400`.** `TokenService.verifyRefreshToken` has no `try/catch` around the JWT verify
   call, and the route has no guard catching a malformed token before it reaches the service.
4. **`IsUniqueVariantConstraint` / `IsValidSKUsConstraint`** (`src/dtos/product/product.validation.ts`)
   crash with `500` on an omitted `variants`/`skus` field instead of returning a clean `400`
   validation error — the custom validators assume the field is present rather than guarding
   against `undefined`.
5. **`GET /brands/:id` 400s for every request, even a genuinely valid brand id.**
   `BrandController.getBrandById(@Param("id") param: BrandIdParamDto)` binds only the raw `id`
   string to a parameter typed as the _whole_ DTO, so the global `ValidationPipe` never populates
   `param.id` and `@IsUUID` fails validating `undefined`. Sibling handlers on the same controller
   (`updateBrand`/`deleteBrand`) use `@Param() param: BrandIdParamDto` (the whole params object)
   and do not have this bug — `getBrandById` is the one outlier.
6. **`GET /brands/:id` requires authentication despite its `@ApiPublic` Swagger tag and summary
   ("Get a brand by ID").** `ApiPublic` (`src/shared/param-decorators/http-decorator.ts`) only adds
   Swagger response metadata — it does not apply `@IsPublicApi()` — so the route sits behind the
   default auth guard like every other route, unlike `GET /brands` (list), which does carry
   `@IsPublicApi()` and is genuinely public.

## CI

The `test-e2e` job in `.github/workflows/ci.yml` runs the same commands as above on every
non-draft pull request: it starts `db` and `redis` via `docker compose up -d --wait` (not
GitHub Actions' native `services:` blocks, because `scripts/prepare-e2e-database.sh` shells out
to `docker compose ps -q redis` to flush the cache — the job needs the same compose-managed
containers a developer runs locally), writes `.env`/`.env.test` from the committed `.example`
files, then runs `pnpm test:e2e`. A red test fails the job like any other CI check.
