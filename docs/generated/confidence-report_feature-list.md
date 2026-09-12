---
source_artifact: docs/generated/feature-list.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/feature-list.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| BL005_SendVerificationCodeEmail — `` call site is currently commented out (see US005); documented h… | Feature Details | — | △ |
| UserTranslation (MODEL003) — `` schema models per-language profile fields (address/description) aga… | Feature Details | — | △ |
| Additionally, `UserTranslation` (MODEL003) has no dedicated route either; it is listed under F009 a… | Unexposed Schema-Only Models (not assigned to any Feature) | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Feature Details: BL005_SendVerificationCodeEmail — `` call site is currently commented out (see US005); documented h…
- Feature Details: UserTranslation (MODEL003) — `` schema models per-language profile fields (address/description) aga…
- Unexposed Schema-Only Models (not assigned to any Feature): Additionally, `UserTranslation` (MODEL003) has no dedicated route either; it is listed under F009 a…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
