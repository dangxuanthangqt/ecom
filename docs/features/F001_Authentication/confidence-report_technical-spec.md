---
source_artifact: docs/features/F001_Authentication/technical-spec.md
claims_total: 33
claims_with_evidence: 33
confidence_derived: 1.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F001_Authentication/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:68-76 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:105-134 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/user/user.repository.ts:22-58 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:148-154 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:394-442 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/verification-code/verification-code.repository.ts:47-83 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:85-100 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:145-234 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/device/device.repository.ts:28-58 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:109-123 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:284-354 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/refresh-token/refresh-token.repository.ts:24-100 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:132-139 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:362-385 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/device/device.repository.ts:60-96 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:171-178 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/google.service.ts:49-67 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:183-211 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/google.service.ts:76-156 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/device/device.repository.ts:28-58 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.controller.ts:220-226 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/auth/auth.service.ts:453-493 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/verification-code/verification-code.repository.ts:47-83 | ○ |
| → `src/repositories/user/user.repository.ts` | 3. Actions | src/routes/auth/auth.controller.ts:228-261 | ○ |
| → `src/repositories/user/user.repository.ts` | 3. Actions | src/routes/auth/auth.service.ts:502-608 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/refresh-token/refresh-token.repository.ts:24-100 | ○ |
| · route-list.md PERM001-PERM003 | 4. Shared Foundation | src/shared/modules/base.module.ts:39-42 | ○ |
| · route-list.md PERM001-PERM003 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:22-123 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/role/shared-role.repository.ts:25-47 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/auth/auth.service.ts:67-96 | ○ |
| (A4 update) | 4. Shared Foundation | src/routes/auth/auth.service.ts:219-224 | ○ |
| (A4 update) | 4. Shared Foundation | src/routes/auth/auth.service.ts:326-334 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/auth/google.service.ts:32-156 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

_(none -- no marker-tagged claims)_

## Risk Flags

_(none)_
