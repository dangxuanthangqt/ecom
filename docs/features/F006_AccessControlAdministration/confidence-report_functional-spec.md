---
source_artifact: docs/features/F006_AccessControlAdministration/functional-spec.md
claims_total: 4
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F006_AccessControlAdministration/functional-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| [ ] `` A hand-created row may be deleted the next time the CAP-03 sync script runs, if its (path, m… | 7. User Stories | — | △ |
| RISK-01 \| known-issue \| Editing a permission row's `path` does not recompute its `module` label — t… | 11. Risks & Known Issues | — | △ |
| RISK-02 \| known-issue \| The permission `method` field's database enum has 7 values (adds OPTIONS an… | 11. Risks & Known Issues | — | △ |
| RISK-03 \| risk \| No automatic trigger (deploy hook, CI/CD step, app startup) was found for the perm… | 11. Risks & Known Issues | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 7. User Stories: [ ] `` A hand-created row may be deleted the next time the CAP-03 sync script runs, if its (path, m…
- 11. Risks & Known Issues: RISK-01 \| known-issue \| Editing a permission row's `path` does not recompute its `module` label — t…
- 11. Risks & Known Issues: RISK-02 \| known-issue \| The permission `method` field's database enum has 7 values (adds OPTIONS an…
- 11. Risks & Known Issues: RISK-03 \| risk \| No automatic trigger (deploy hook, CI/CD step, app startup) was found for the perm…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
