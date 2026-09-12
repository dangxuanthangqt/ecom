---
source_artifact: docs/system/architecture.md
claims_total: 20
claims_with_evidence: 16
confidence_derived: 0.8
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/system/architecture.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/app.module.ts:8 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/routes/route.module.ts:18-32 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/shared/modules/base.module.ts:36-43 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/shared/modules/base.module.ts:65-73 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/shared/modules/shared.module.ts:12-27 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/repositories/product/product.repository.ts:29 | ○ |
| (`PrismaClient` subclass); `src/routes/auth/google.service.ts` (Google integration, per scout BL in… | System Architecture | src/shared/services/prisma.service.ts:5 | ○ |
| **Shared/cross-cutting repository** (e.g. `SharedUserRepository`, `SharedRoleRepository` in `src/ro… | Layering | — | △ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/authorization-header.guard.ts:39-78 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/access-token.guard.ts:101-122 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/access-token.guard.ts:56-90 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/modules/base.module.ts:45-58 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/modules/base.module.ts:60-63 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/filters/prisma-exception.filter.ts:61-67 | ○ |
| (`@Catch(HttpException)`, also handles `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/filters/external-exception.filter.ts:18-19 | ○ |
| CORS \| Hardcoded single origin `http://localhost:3000`, methods `GET,HEAD,PUT,PATCH,POST,DELETE` \|… | Cross-Cutting Concerns | — | △ |
| (`ManageProductController` registered inside `ProductModule`, not a separate top-level module — rec… | Module Graph (route feature modules) | src/routes/route.module.ts:18-32 | ○ |
| (`ManageProductController` registered inside `ProductModule`, not a separate top-level module — rec… | Module Graph (route feature modules) | src/routes/product/product.module.ts:12 | ○ |
| **Two Prisma schema files** exist (`prisma/schema.prisma`, `prisma/schema.development.prisma`); the… | Notes | — | △ |
| Concerns/Blockers:** Two open `` items carried from scout-report (dual Prisma schema selection mech… | Notes | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Layering: **Shared/cross-cutting repository** (e.g. `SharedUserRepository`, `SharedRoleRepository` in `src/ro…
- Cross-Cutting Concerns: CORS \| Hardcoded single origin `http://localhost:3000`, methods `GET,HEAD,PUT,PATCH,POST,DELETE` \|…
- Notes: **Two Prisma schema files** exist (`prisma/schema.prisma`, `prisma/schema.development.prisma`); the…
- Notes: Concerns/Blockers:** Two open `` items carried from scout-report (dual Prisma schema selection mech…

## Risk Flags

_(none)_
