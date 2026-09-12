---
source_artifact: docs/generated/api-map.md
claims_total: 1
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/api-map.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| Concerns/Blockers:** (1) Auth column uses guard-name terminology ("public"/"Bearer"), not PERM### c… | Webhooks / External Calls | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Webhooks / External Calls: Concerns/Blockers:** (1) Auth column uses guard-name terminology ("public"/"Bearer"), not PERM### c…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
