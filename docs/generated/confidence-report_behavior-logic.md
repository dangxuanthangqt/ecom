---
source_artifact: docs/generated/behavior-logic.md
claims_total: 2
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/behavior-logic.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| : no CI/CD step or npm postinstall hook was found wiring this script into deploy; it is invoked man… | BL001_SyncRoutePermissionsScript | — | △ |
| Thin wrapper around the Resend SDK (`resend.emails.send`, `:16-21`), hardcoded `from: "onboarding@r… | BL005_SendVerificationCodeEmail | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- BL001_SyncRoutePermissionsScript: : no CI/CD step or npm postinstall hook was found wiring this script into deploy; it is invoked man…
- BL005_SendVerificationCodeEmail: Thin wrapper around the Resend SDK (`resend.emails.send`, `:16-21`), hardcoded `from: "onboarding@r…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
