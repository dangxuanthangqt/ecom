---
source_artifact: docs/features/F009_OwnProfileManagement/functional-spec.md
claims_total: 2
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F009_OwnProfileManagement/functional-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| **FR-203** `` Updating the profile does not restrict which `status` or `role` value the caller may… | 4. Requirements | — | △ |
| **FR-602** `` No check limits a caller's own-profile update to a role at or below their current pri… | 4. Requirements | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 4. Requirements: **FR-203** `` Updating the profile does not restrict which `status` or `role` value the caller may…
- 4. Requirements: **FR-602** `` No check limits a caller's own-profile update to a role at or below their current pri…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
