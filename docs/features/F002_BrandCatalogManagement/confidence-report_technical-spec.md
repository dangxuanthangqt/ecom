---
source_artifact: docs/features/F002_BrandCatalogManagement/technical-spec.md
claims_total: 30
claims_with_evidence: 21
confidence_derived: 0.7
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F002_BrandCatalogManagement/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.controller.ts:42-58 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.service.ts:30-72 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/brand/brand.repository.ts:49-87 | ○ |
| Who** · any caller — **but see `` below: runtime actually requires a `Bearer` session** | 3. Actions | — | △ |
| FR-602 ``** — this handler carries `@ApiPublic` (a Swagger-doc-only decorator) but | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.controller.ts:60-78 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.service.ts:81-94 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/brand/brand.repository.ts:96-127 | ○ |
| BR-005 ``** — because role→module permission grants are filtered by module name | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.controller.ts:80-98 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.service.ts:103-120 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/brand/brand.repository.ts:136-183 | ○ |
| BR-005 ``** — same client-can-mutate finding as A3. *(§ 4.4)* | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.controller.ts:100-113 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.service.ts:130-149 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/brand/brand.repository.ts:219-278 | ○ |
| BR-005 ``** — same client-can-mutate finding as A3/A4. *(§ 4.4)* | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.controller.ts:115-130 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/brand/brand.service.ts:159-175 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/brand/brand.repository.ts:288-331 | ○ |
| A5 \| Hard-deleting a brand still referenced by `Product` rows (FK: `Product.brandId`) \| Prisma fore… | 3. Actions | — | △ |
| · route-list.md ROUTE011-ROUTE015 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-90 | ○ |
| · route-list.md ROUTE011-ROUTE015 | 4. Shared Foundation | src/shared/modules/base.module.ts:17-43 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/brand.selector.ts:12-27 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/brand/brand.repository.ts:191-209 | ○ |
| BR-005 `` — role→module permission grants are filtered by module name only, never | 4. Shared Foundation | — | △ |
| on `/brands*` alike. `` whether this is an intended "client can curate the brand | 4. Shared Foundation | — | △ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:22-29 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:158-169 | ○ |
| *(A2)* The `` `Bearer`-required behavior on `GET /brands/:id` is assumed to be the | 5. Verification & Technical Notes | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: Who** · any caller — **but see `` below: runtime actually requires a `Bearer` session**
- 3. Actions: FR-602 ``** — this handler carries `@ApiPublic` (a Swagger-doc-only decorator) but
- 3. Actions: BR-005 ``** — because role→module permission grants are filtered by module name
- 3. Actions: BR-005 ``** — same client-can-mutate finding as A3. *(§ 4.4)*
- 3. Actions: BR-005 ``** — same client-can-mutate finding as A3/A4. *(§ 4.4)*
- 3. Actions: A5 \| Hard-deleting a brand still referenced by `Product` rows (FK: `Product.brandId`) \| Prisma fore…
- 4. Shared Foundation: BR-005 `` — role→module permission grants are filtered by module name only, never
- 4. Shared Foundation: on `/brands*` alike. `` whether this is an intended "client can curate the brand
- 5. Verification & Technical Notes: *(A2)* The `` `Bearer`-required behavior on `GET /brands/:id` is assumed to be the

## Risk Flags

_(none)_
