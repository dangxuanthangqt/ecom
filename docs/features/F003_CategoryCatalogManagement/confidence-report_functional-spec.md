---
source_artifact: docs/features/F003_CategoryCatalogManagement/functional-spec.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F003_CategoryCatalogManagement/functional-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| RISK-02 \| known-issue \| The "category cannot be its own parent" check on update only rejects a *dir… | 11. Risks & Known Issues | — | △ |
| RISK-03 \| risk \| Because the role→module permission grant filters by module name only, never by HTT… | 11. Risks & Known Issues | — | △ |
| RISK-04 \| known-issue \| Create/update code catches a database unique-constraint violation and repor… | 11. Risks & Known Issues | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 11. Risks & Known Issues: RISK-02 \| known-issue \| The "category cannot be its own parent" check on update only rejects a *dir…
- 11. Risks & Known Issues: RISK-03 \| risk \| Because the role→module permission grant filters by module name only, never by HTT…
- 11. Risks & Known Issues: RISK-04 \| known-issue \| Create/update code catches a database unique-constraint violation and repor…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
