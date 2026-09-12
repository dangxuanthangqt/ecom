---
source_artifact: docs/features/F006_AccessControlAdministration/technical-spec.md
claims_total: 50
claims_with_evidence: 47
confidence_derived: 0.94
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F006_AccessControlAdministration/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.controller.ts:36-49 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.service.ts:26-56 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/permission/permission.repository.ts:29-72 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.controller.ts:51-72 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.service.ts:64-68 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/permission/permission.repository.ts:80-106 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.controller.ts:74-92 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.service.ts:77-97 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/permission/permission.repository.ts:114-189 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.controller.ts:94-121 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.service.ts:107-131 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/permission/permission.repository.ts:199-257 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.controller.ts:123-150 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/permission/permission.service.ts:141-157 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/permission/permission.repository.ts:267-319 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.controller.ts:36-49 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:30-57 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/role/role.repository.ts:24-59 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.controller.ts:58-72 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:66-70 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/role/role.repository.ts:67-90 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.controller.ts:74-92 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:79-96 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/role/role.repository.ts:98-177 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.controller.ts:94-121 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:104-152 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/role/role.repository.ts:98-246 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.controller.ts:123-150 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:104-120 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/role/role.service.ts:162-180 | ○ |
| (unlabeled claim) | 3. Actions | src/repositories/role/role.repository.ts:256-300 | ○ |
| (unlabeled claim) | 3. Actions | initial-scripts/create-permission.ts:37-147 | ○ |
| (unlabeled claim) | 3. Actions | initial-scripts/create-permission.ts:149-192 | ○ |
| (unlabeled claim) | 3. Actions | initial-scripts/index.ts:30-84 | ○ |
| A5 · A10 \| `isHardDelete: true` on a row still referenced by its join table \| Prisma cascades the `… | 3. Actions | — | △ |
| OPTIONS \| *(headless API — no render)* \| **Rejected** by the app-level `HTTPMethod` constant (`src/… | 4. Shared Foundation | — | △ |
| HEAD \| *(headless API — no render)* \| Same rejection as OPTIONS \| `` unreachable, same reasoning as… | 4. Shared Foundation | — | △ |
| (`isActive` + `deletedAt` columns) | 4. Shared Foundation | prisma/schema.prisma:205-225 | ○ |
| · route-list.md ROUTE041-045, ROUTE061-065 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (update, no module recompute) | 4. Shared Foundation | src/routes/permission/permission.service.ts:90 | ○ |
| (update, no module recompute) | 4. Shared Foundation | src/routes/permission/permission.service.ts:107-131 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/permission/permission.repository.ts:220-222 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/role/role.repository.ts:205-209 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/permission/permission.repository.ts:114-135 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/repositories/role/role.repository.ts:98-119 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/role/role.service.ts:17 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/routes/role/role.service.ts:104-120 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:41-110 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| (unlabeled claim) | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: A5 · A10 \| `isHardDelete: true` on a row still referenced by its join table \| Prisma cascades the `…
- 4. Shared Foundation: OPTIONS \| *(headless API — no render)* \| **Rejected** by the app-level `HTTPMethod` constant (`src/…
- 4. Shared Foundation: HEAD \| *(headless API — no render)* \| Same rejection as OPTIONS \| `` unreachable, same reasoning as…

## Risk Flags

_(none)_
