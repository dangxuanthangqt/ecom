---
source_artifact: docs/features/F009_OwnProfileManagement/technical-spec.md
claims_total: 14
claims_with_evidence: 11
confidence_derived: 0.7857
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F009_OwnProfileManagement/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| Result** · read-only — returns the caller's `id/name/email/phoneNumber/avatar/status` plus their `r… | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.controller.ts:22-37 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.service.ts:32-49 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/user/shared-user.repository.ts:26-49 | ○ |
| **FR-203/FR-602 — `` no ownership/hierarchy check on `status` or `roleId`.** `status` is validated… | 3. Actions | — | △ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.controller.ts:39-58 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.service.ts:59-90 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/user/shared-user.repository.ts:206-232 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.controller.ts:60-78 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/profile/profile.service.ts:100-176 | ○ |
| (unlabeled claim) | 3. Actions | src/shared/services/hashing.service.ts:9-16 | ○ |
| · route-list.md ROUTE058-ROUTE060 | 4. Shared Foundation | src/shared/modules/base.module.ts:39-42 | ○ |
| · route-list.md ROUTE058-ROUTE060 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| 1. **UserTranslation ownership** *(no action in this feature)*: confirmed — no code under `src/` re… | 5. Verification & Technical Notes | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: Result** · read-only — returns the caller's `id/name/email/phoneNumber/avatar/status` plus their `r…
- 3. Actions: **FR-203/FR-602 — `` no ownership/hierarchy check on `status` or `roleId`.** `status` is validated…
- 5. Verification & Technical Notes: 1. **UserTranslation ownership** *(no action in this feature)*: confirmed — no code under `src/` re…

## Risk Flags

_(none)_
