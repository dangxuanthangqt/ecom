# Error Contract Unification: Silent Void in throw-http-exception Helper, Weakened Tests That Hid It, and a Postgres Blocker That Was Just Stopped

**Date**: 2026-09-15 00:45
**Severity**: high
**Component**: API error response contract, exception filters, validation pipe
**Status**: resolved

## What Happened

The user asked whether a `ValidationPipe` `exceptionFactory` wrapping errors in a `ValidateException` was best practice. Investigation surfaced a deeper fracture: four different code paths in the codebase were producing four incompatible error shapes. The `message` key alone held three different types depending on the source — a `{field,message}[]` array from class-validator, a JSON string of Zod issues, a plain string from `HttpException`, a different plain string from the Prisma filter. There was no constraint code identity anywhere (it was commented out), so a client had only English message text to branch on, and no two validation errors looked the same.

Unified every error response behind a single `GlobalExceptionFilter` that dispatches to pure mappers, replaced the two error DTOs (`DefaultExceptionDto`, `BadRequestExceptionDto`) with one `ErrorResponseDto`, re-enabled constraint identity in `ErrorDetailDto.code`, rewrote `throw-http-exception.util.ts` to preserve field information, and removed `nestjs-zod` from the HTTP pipeline. Added comprehensive documentation in `docs/error-handling.md`. Three commits: refactor, test updates, docs reconciliation.

## The Brutal Truth

This is where it stings. The refactor looked unified on the spec, and the tests passed green, but **the main error call site was actually bypassing the envelope entirely for production use**. `throw-http-exception.util.ts` is the path the vast majority of error throws take across the codebase — and it was wrapping its payload inconsistently: for `badRequest` it wrapped the detail array under `message`, for every other error type it dropped `field` entirely. Reading that file after noticing an unfamiliar spec name in the test output was the only thing that caught it. There was no gate that found it. The lesson is bitter: when unifying a cross-cutting concern, enumerating the call sites is not optional — it is the fundamental check. Without it, you believe the contract is unified when production is still broken.

Worse still: a test that should have caught the `NotFoundException` problem — literally titled "maps a plain NotFoundException to NOT_FOUND" — had been weakened to hide it. The assertion was `expect(typeof response.error).toBe("string")`, which passed because Nest stamps its default English description ("Not Found") into the `error` field, so the test got a string and asked nothing more. A test that weakens to pass is worse than having no test. It reports coverage over a defect and robs you of the one gate that would have screamed during CI.

The tester's blocker report added another layer of pain: the e2e suite was marked BLOCKED because it "needed Postgres on port 5433 that docker-compose does not provide". The real situation: `.env.test` did point to 5433, and `docker-compose ps` showed an `ecom-task-pg` container that was simply stopped. `docker start ecom-task-pg` was the complete fix. Had that been accepted at face value, the work would have shipped without a gate.

Two filters also meant the response shape silently depended on provider order — a fact that is invisible at every throw site and trivially broken by reordering an array in `AppModule`.

## Technical Details

**The call-site void:**

`src/shared/utils/throw-http-exception.util.ts` has roughly 265 call sites across services and repositories. It built a `{ message, field }` detail object, then for `badRequest` wrapped it in an array under `message` — reintroducing the exact polymorphism this refactor set out to remove — while for `notFound`, `conflict`, `forbidden` and the rest it passed the object through as the exception payload. The old `ExternalExceptionFilter` read only `.message` off that payload, so `field` was silently discarded for every type except `badRequest`:

```ts
throwHttpException({
  type: "conflict",
  message: "Brand already exists.",
  field: "brand",
});
// old response: { statusCode: 409, message: "Brand already exists." }   ← field gone
```

Fixed by rewriting the helper to emit the envelope directly, with `field` becoming one `details` entry and two new optional params, `code` and `error`. Nine unit spec files encoded the old payload and had to be updated.

**The test weakening:**

The weakened test was in the newly written `src/shared/filters/__tests__/global-exception.filter.spec.ts`, in a case titled "maps a plain NotFoundException to NOT_FOUND with string message and empty details":

```ts
expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
expect(typeof response.error).toBe("string"); // ← passes: Nest fills error="Not Found"
expect(response.message).toBe("User not found");
```

The assertion should have been `expect(response.error).toBe("NOT_FOUND")`. Instead it asked only `typeof`, so the title claimed a check the body never made. Nest's default behavior on `new NotFoundException("msg")` is to stamp `error: "Not Found"` (the HTTP phrase) into the response, defeating the entire point of a machine-readable code. The fix validates incoming `error` against `/^[A-Z][A-Z0-9_]*$/` and re-derives from status if it fails.

**Postgres non-blocker:**

`.env.test` pointed `DATABASE_URL` at `localhost:5433/ecom_e2e`. That port is served by an `ecom-task-pg` container which exists but was stopped — and which is not declared in `docker-compose.yml` at all, which is presumably what misled the tester into reporting that compose "does not provide" it. `docker ps -a` showed it in one line. `docker start ecom-task-pg` was the whole fix; `pnpm test:e2e` then ran 112 tests green.

**Latent defects found and fixed:**

- Prisma `P2001` (record not found) was mapped to `204 No Content` with a JSON body — a status that forbids a body per HTTP spec, and the wrong semantics (204 is "success, nothing to report"). Corrected to `404`.
- The Prisma filter called `getResponse()` where the code meant `getRequest()` — a silent logic error.

**Pre-existing findings, deliberately not fixed in this PR:**

`src/shared/guards/api-key.guard.ts:23` compares the incoming header against the hardcoded literal string `"secretApiKey"` while the configured `SECRET_API_KEY` lookup sits on line 21, commented out. Any caller sending that exact string passes the guard in every environment. This is a security hole, pre-existing, and belongs on its own ticket. Recorded and reported to the user; deliberately untouched.

**Pre-existing intermittent flake:**

`test/e2e/health.e2e-spec.ts` "GET /cart with a real login token succeeds" failed on 1 of 3 runs with a 404. Unrelated to error handling work.

**Tooling noise:**

- `licenseal` reports 0 violations but one _gap_, because it cannot parse `pnpm-lock.yaml` (a multi-document YAML stream; single-document parsers reject it). This reproduces on `master`; `pnpm install --frozen-lockfile` exits 0.
- Running the `sunlint` CLI drops a `.sunlint-eslint.config.js` into the repo root that then breaks `pnpm es-check` until deleted. Cleanup script would save the next person time.

**Final measurements:**

- `pnpm lint`: exit 0
- `pnpm test`: 141 suites, 1583 passed, 4 skipped, 0 failed
- `pnpm test:e2e`: 25 suites, 112 passed
- SunLint: 0 errors, grade B (S056 log-injection flag is a false positive — output goes through nestjs-pino JSON, escaping newlines)
- Branch pushed to `refactor/api-error-contract`; PR could not be opened via `gh` (repo is `dangxuanthangqt/ecom`, authenticated as `thangdx-1076`, lacks collaborator permission). PR body saved to `plans/260914-error-contract-refactor/reports/pr-body.md`.

## What We Tried

**Trusting the spec without enumerating call sites.** After unifying the filter and DTOs, we believed the contract was unified because we had read and unified the central artifact. We did not walk the codebase and enumerate every place that threw an error. That is why `throw-http-exception.util.ts` was not discovered until the test output showed something unexpected. Lesson: there is no substitute for enumeration.

**Accepting the tester's blocker at face value.** The report said "needs Postgres on 5433 that docker-compose does not provide". We did not ask for the exact error or check the environment ourselves. `docker ps -a` would have shown the stopped container immediately.

## Root Cause Analysis

**The void in throw-http-exception.util.ts existed because no single gate saw all the error paths.** The helper was written to handle one case (`badRequest`) correctly and then extended to other types without revisiting the design. Each call site tested its own path in isolation. A unit test for `throwHttpException("notFound", "...")` passed because it asserted only the shape, not the content. The filter tests did not exercise this path because they tested the filter in isolation, not through the helper. The result: a critical cross-cutting function was correct nowhere but in one specific scenario.

**The test weakness came from a test that reported coverage without verifying behavior.** The test was titled for what it should have checked but never did. This is a pattern: when a test passes but is titled to suggest it verifies something it doesn't, the title becomes a lie detector you ignore. The next person reading the test title trusts the title. This one was weakened to pass, and nobody caught it because the assertion did verify _something_ (that a field exists), even though it was the wrong something.

**The blocker misdiagnosis happened because verification was not done at report time.** The tester reported what it believed to be true without running the check that would have shown the truth. A report that says "X is not available" should include evidence: `docker ps output showed`, `docker compose logs revealed`, or similar. Without that, the report is a theory, not a fact.

**Two filters made the response shape a function of provider order.** To be precise about the risk, since it is easy to overstate: the two filters' `@Catch()` sets — `HttpException` and the five Prisma classes — did not actually overlap, so neither shadowed the other as registered. The hazard is structural rather than active. Nest selects the answering filter by matching `@Catch()` metadata against the `APP_FILTER` array in order, so the moment anyone adds a third filter with an overlapping or bare `@Catch()`, the body shape starts depending on a position in an array in `BaseModule` — invisible at every throw site, and changed by an innocent reordering. One filter dispatching to pure mappers removes the category of bug rather than the current instance of it.

## Lessons Learned

**Enumerate every call site when unifying a cross-cutting concern.** Believing a concern is unified because its central artifact is unified is a false confidence. `grep -r "throwHttpException"` and walk every hit. `grep -r "throw.*Exception"` and verify none of them have their own response-building logic. This is not glamorous work, but it is the gate that no test can replace.

**A test that weakens to pass is worse than having no test.** An assertion that checks `typeof` instead of value, or checks existence instead of equality, or checks a range instead of a fixed expectation, will pass wrong code and hide the defect under the guise of coverage. When a test feels "close enough," make it exact. Write the hard assertion.

**Verify a reported blocker against the environment before accepting it.** "X is not available" should trigger `docker ps`, `docker logs`, `ps aux`, `systemctl status`, a network trace, or whatever is appropriate. No report is final until you have seen the evidence with your own eyes. The tester might have misunderstood the configuration, or the infrastructure might have a transient state. Verification takes five minutes and saves shipping untested code.

**Framework defaults can silently defeat a contract.** Nest stamps `error: "Not Found"` into a 404 response even though you asked for machine-readable codes. Read the framework's source or write a tiny test to see what a `new NotFoundException()` actually produces. Never assume that passing a custom string means that string lands unchanged in the response.

**One filter with pure mappers beats two filters with routing logic.** Two filters are two separate places to read, two separate paths for a request to take, and an invisible ordering dependency. One filter that dispatches to testable pure functions is clearer, fewer places to hide bugs, and unit-testable without booting Nest.

## Next Steps

1. **Audit error-throwing patterns repo-wide.** Review `throw` statements across services and guards to verify none are building responses independently. Owner: any senior engineer. Non-blocking, but protective. By next sprint.

2. **Harden test assertions across the codebase.** Pull a random sampling of passing tests and ask: "Does this assertion verify the specific behavior, or just something in the ballpark?" Strengthen any that are weakened. Owner: QA lead + reviewers. Ongoing practice.

3. **Fix the pre-existing auth bypass in api-key.guard.ts.** Uncomment the `SECRET_API_KEY` lookup on line 21; remove the hardcoded literal comparison on line 23. Owner: security-focused engineer. Create a separate ticket; critical priority.

4. **Investigate the intermittent flake in health.e2e-spec.ts.** The "GET /cart with real login token succeeds" test fails ~1 in 3 runs. Owner: tester. Non-blocking but affects CI confidence.

5. **Document the tooling gaps.** Licenseal cannot parse pnpm lockfiles; sunlint drops side-effect files. Document workarounds in `DEVELOPMENT.md` so the next person doesn't lose time. Owner: anyone. This week.

6. **Review all PR checklist items before submitting.** The PR could not be merged because of auth (thangdx-1076 is not a collaborator on dangxuanthangqt/ecom). The changes are solid and pushed; when the account permission issue is resolved, open the PR from `refactor/api-error-contract` against `master`.
