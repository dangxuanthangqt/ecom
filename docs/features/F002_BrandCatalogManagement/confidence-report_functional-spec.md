---
source_artifact: docs/features/F002_BrandCatalogManagement/functional-spec.md
claims_total: 8
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F002_BrandCatalogManagement/functional-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| **FR-602** `` Viewing a single brand's detail is documented as public but is enforced as `Bearer`-r… | 4. Requirements | — | △ |
| `` Because role-to-module permission grants are filtered by module only, not by HTTP method, a `cli… | 5. Business Rules | — | △ |
| [ ] `` This call requires a valid `Bearer` session at runtime despite being documented as public —… | 7. User Stories | — | △ |
| [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002. | 7. User Stories | — | △ |
| [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002. | 7. User Stories | — | △ |
| [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002. | 7. User Stories | — | △ |
| RISK-01 \| known-issue \| The brand detail lookup (ROUTE012) is documented as public but actually req… | 11. Risks & Known Issues | — | △ |
| RISK-02 \| known-issue \| Role→module permission grants are filtered by module name only, never by HT… | 11. Risks & Known Issues | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 4. Requirements: **FR-602** `` Viewing a single brand's detail is documented as public but is enforced as `Bearer`-r…
- 5. Business Rules: `` Because role-to-module permission grants are filtered by module only, not by HTTP method, a `cli…
- 7. User Stories: [ ] `` This call requires a valid `Bearer` session at runtime despite being documented as public —…
- 7. User Stories: [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002.
- 7. User Stories: [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002.
- 7. User Stories: [ ] `` A `client`-role caller can also perform this action today — see Open Decision D002.
- 11. Risks & Known Issues: RISK-01 \| known-issue \| The brand detail lookup (ROUTE012) is documented as public but actually req…
- 11. Risks & Known Issues: RISK-02 \| known-issue \| Role→module permission grants are filtered by module name only, never by HT…

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
