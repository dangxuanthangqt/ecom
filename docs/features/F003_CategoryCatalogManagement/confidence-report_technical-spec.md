---
source_artifact: docs/features/F003_CategoryCatalogManagement/technical-spec.md
claims_total: 19
claims_with_evidence: 16
confidence_derived: 0.8421
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F003_CategoryCatalogManagement/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| → | 3. Actions | src/routes/category/category.controller.ts:46-61 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:25-38 | ○ |
| → | 3. Actions | src/routes/category/category.controller.ts:79-89 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:47-60 | ○ |
| 422 `"Category is already exists."` on a unique-constraint catch — `` currently | 3. Actions | — | △ |
| → | 3. Actions | src/routes/category/category.controller.ts:99-109 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:69-85 | ○ |
| with this name already exists."` on a unique-constraint catch — `` currently | 3. Actions | — | △ |
| → | 3. Actions | src/routes/category/category.controller.ts:125-138 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:95-114 | ○ |
| → | 3. Actions | src/routes/category/category.controller.ts:154-165 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:122-134 | ○ |
| A3, A4 \| Prisma reports a unique-constraint violation on the category write \| 422 `"Category is alr… | 3. Actions | — | △ |
| · | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/category/category.repository.ts:99-116 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:40-49 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:76-79 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:254-263 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/category.selector.ts:13-26 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: 422 `"Category is already exists."` on a unique-constraint catch — `` currently
- 3. Actions: with this name already exists."` on a unique-constraint catch — `` currently
- 3. Actions: A3, A4 \| Prisma reports a unique-constraint violation on the category write \| 422 `"Category is alr…

## Risk Flags

_(none)_
