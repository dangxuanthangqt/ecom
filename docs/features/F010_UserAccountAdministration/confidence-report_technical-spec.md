---
source_artifact: docs/features/F010_UserAccountAdministration/technical-spec.md
claims_total: 14
claims_with_evidence: 13
confidence_derived: 0.9286
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F010_UserAccountAdministration/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| → | 3. Actions | src/routes/user/user.controller.ts:39-52 | ○ |
| → | 3. Actions | src/routes/user/user.service.ts:55-98 | ○ |
| → | 3. Actions | src/routes/user/user.controller.ts:54-73 | ○ |
| → | 3. Actions | src/routes/user/user.service.ts:34-44 | ○ |
| → | 3. Actions | src/routes/user/user.controller.ts:75-95 | ○ |
| → | 3. Actions | src/routes/user/user.service.ts:108-147 | ○ |
| → | 3. Actions | src/routes/user/user.controller.ts:97-124 | ○ |
| → | 3. Actions | src/routes/user/user.service.ts:239-285 | ○ |
| → | 3. Actions | src/routes/user/user.controller.ts:126-151 | ○ |
| → | 3. Actions | src/routes/user/user.service.ts:295-345 | ○ |
| INACTIVE \| Same field, same response shape as ACTIVE \| None — accepted as-is; `` whether any OTHER… | 4. Shared Foundation | — | △ |
| (unlabeled claim) | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-122 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 4. Shared Foundation: INACTIVE \| Same field, same response shape as ACTIVE \| None — accepted as-is; `` whether any OTHER…

## Risk Flags

_(none)_
