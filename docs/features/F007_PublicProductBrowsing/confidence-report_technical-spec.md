---
source_artifact: docs/features/F007_PublicProductBrowsing/technical-spec.md
claims_total: 15
claims_with_evidence: 15
confidence_derived: 1.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F007_PublicProductBrowsing/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | src/routes/product/product.controller.ts:35-44 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/product/product.service.ts:18-79 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/product/product.repository.ts:46-132 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/product/product.controller.ts:60-71 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/product/product.service.ts:81-100 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/product/product.repository.ts:144-174 | ○ |
| · ROUTE051, ROUTE052 | 4. Shared Foundation | src/shared/param-decorators/auth-api.decorator.ts:10-19 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/product/product.service.ts:59 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/product/product.repository.ts:85-98 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/product/product.service.ts:88-93 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/product.selector.ts:10-22 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/product.selector.ts:41-65 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/brand.selector.ts:13-27 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/product.selector.ts:60-63 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/selectors/category.selector.ts:6-10 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

_(none -- no marker-tagged claims)_

## Risk Flags

_(none)_
