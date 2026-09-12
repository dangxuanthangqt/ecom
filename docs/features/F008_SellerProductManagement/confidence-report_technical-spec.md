---
source_artifact: docs/features/F008_SellerProductManagement/technical-spec.md
claims_total: 19
claims_with_evidence: 18
confidence_derived: 0.9474
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F008_SellerProductManagement/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:49-65 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:31-48 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:50-119 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:74-95 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:121-144 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:104-115 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:185-232 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:124-139 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:146-183 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:154-167 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:234-263 | ○ |
| A4 \| Two concurrent updates to the same product's SKU list \| No optimistic lock observed — last `$t… | 3. Actions | — | △ |
| (unlabeled claim) | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/product/manage-product/manage-product.service.ts:31-48 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/dtos/product/product.validation.ts:15-46 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/dtos/product/product.validation.ts:62-96 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/product/product.repository.ts:183-198 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: A4 \| Two concurrent updates to the same product's SKU list \| No optimistic lock observed — last `$t…

## Risk Flags

_(none)_
