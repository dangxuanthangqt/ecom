---
source_artifact: docs/generated/user-stories.md
claims_total: 7
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/generated/user-stories.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| with `admin` as the sole actor; `client` write-access to those two modules is `` and | Preamble | — | △ |
| AC: `` Swagger labels this `@ApiPublic` but it carries no `@IsPublicApi()` — runtime requires a Bea… | Brands | — | △ |
| AC: `` per source contradiction noted above — whether `client` can also call this is unresolved; on… | Brands | — | △ |
| AC: Same `` client-access caveat as US012. | Brands | — | △ |
| AC: Same `` client-access caveat as US012. | Brands | — | △ |
| AC: A valid payload creates a new `Category` row. `` same client-access caveat as brands. | Categories | — | △ |
| AC: Creates a `Permission` row. AC: `` this may be overwritten by the next run of BL001's sync scri… | Permissions (admin-only module) | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Preamble: with `admin` as the sole actor; `client` write-access to those two modules is `` and
- Brands: AC: `` Swagger labels this `@ApiPublic` but it carries no `@IsPublicApi()` — runtime requires a Bea…
- Brands: AC: `` per source contradiction noted above — whether `client` can also call this is unresolved; on…
- Brands: AC: Same `` client-access caveat as US012.
- Brands: AC: Same `` client-access caveat as US012.
- Categories: AC: A valid payload creates a new `Category` row. `` same client-access caveat as brands.
- Permissions (admin-only module): AC: Creates a `Permission` row. AC: `` this may be overwritten by the next run of BL001's sync scri…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
