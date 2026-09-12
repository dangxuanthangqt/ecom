---
source_artifact: docs/generated/permissions-matrix.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/permissions-matrix.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| This means the permission set for a role is only as current as the last run of this script (there i… | PERM004_DynamicPermissionSeeding: Permission rows generated from the live route table | — | △ |
| `AuthorizationHeaderGuard` supports `AuthorizationType.API_KEY` (dispatches to `ApiKeyGuard`, which… | PERM009_ApiKeyGuardUnused: Alternate API-key auth path exists but unwired | — | △ |
| `GET /brands/:id` (ROUTE012) is decorated with `@ApiPublic` (a Swagger-doc-only decorator, PERM002)… | PERM010_BrandByIdDocDrift: `GET /brands/:id` public-doc vs Bearer-runtime mismatch | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- PERM004_DynamicPermissionSeeding: Permission rows generated from the live route table: This means the permission set for a role is only as current as the last run of this script (there i…
- PERM009_ApiKeyGuardUnused: Alternate API-key auth path exists but unwired: `AuthorizationHeaderGuard` supports `AuthorizationType.API_KEY` (dispatches to `ApiKeyGuard`, which…
- PERM010_BrandByIdDocDrift: `GET /brands/:id` public-doc vs Bearer-runtime mismatch: `GET /brands/:id` (ROUTE012) is decorated with `@ApiPublic` (a Swagger-doc-only decorator, PERM002)…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
