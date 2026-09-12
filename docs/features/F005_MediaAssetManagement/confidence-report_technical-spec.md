---
source_artifact: docs/features/F005_MediaAssetManagement/technical-spec.md
claims_total: 18
claims_with_evidence: 15
confidence_derived: 0.8333
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/features/F005_MediaAssetManagement/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | src/routes/media/media.controller.ts:71-80 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/media/media.service.ts:29-41 | ○ |
| (unlabeled claim) | 3. Actions | src/shared/services/s3.service.ts:75-185 | ○ |
| → | 3. Actions | src/routes/media/media.controller.ts:100-124 | ○ |
| → | 3. Actions | src/shared/pipes/array-images-validation.pipe.ts:21-172 | ○ |
| field-name mismatch — see `functional-spec.md § 11` RISK-02:** the interceptor | 3. Actions | — | △ |
| → | 3. Actions | src/routes/media/media.controller.ts:128-176 | ○ |
| → | 3. Actions | src/shared/pipes/multiple-images-validation.pipe.ts:21-134 | ○ |
| naming/behavior inversion on the download branch — see `functional-spec.md § 11` | 3. Actions | — | △ |
| → | 3. Actions | src/routes/media/media.controller.ts:187-192 | ○ |
| → | 3. Actions | src/routes/media/media.service.ts:114-135 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/media/media.controller.ts:194-206 | ○ |
| (unlabeled claim) | 3. Actions | src/routes/media/media.service.ts:137-141 | ○ |
| (unlabeled claim) | 3. Actions | src/shared/services/s3.service.ts:469-496 | ○ |
| unreachable code, not wired to any live route:** `MediaService#uploadImageFromDisk` | 4. Shared Foundation | — | △ |
| · `route-list.md` ROUTE036-ROUTE040 | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| · `route-list.md` ROUTE036-ROUTE040 | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |
| (unlabeled claim) | 4. Shared Foundation | src/shared/services/s3.service.ts:1-709 | ○ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: field-name mismatch — see `functional-spec.md § 11` RISK-02:** the interceptor
- 3. Actions: naming/behavior inversion on the download branch — see `functional-spec.md § 11`
- 4. Shared Foundation: unreachable code, not wired to any live route:** `MediaService#uploadImageFromDisk`

## Risk Flags

_(none)_
