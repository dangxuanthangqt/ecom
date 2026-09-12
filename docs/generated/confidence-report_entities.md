---
source_artifact: docs/generated/entities.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/entities.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| Authoritative schema**: `prisma/schema.prisma` (563 lines, 21 models, 4 enums). Verified, not ``: `… | Schema Source | — | △ |
| Relationships**: None modeled in schema (no FK to Order/User — reconciliation, if any, happens by m… | Entities | — | △ |
| `` PaymentTransaction has no FK to Order/User and no repository file — reconciliation logic (if any… | Unresolved | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Schema Source: Authoritative schema**: `prisma/schema.prisma` (563 lines, 21 models, 4 enums). Verified, not ``: `…
- Entities: Relationships**: None modeled in schema (no FK to Order/User — reconciliation, if any, happens by m…
- Unresolved: `` PaymentTransaction has no FK to Order/User and no repository file — reconciliation logic (if any…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
