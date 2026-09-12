---
source_artifact: docs/system/overview.md
claims_total: 4
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/system/overview.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| Rationale**: — no ADR or comment states the migration plan explicitly; the `base.module.ts:70` comm… | Key Design Decisions | — | △ |
| **Data Encryption**: Passwords hashed with bcrypt, 10 salt rounds (`hashing.service.ts:4-12`). JWT… | Security Overview | — | △ |
| **Scaling Strategy**: — no autoscaling config, no k8s manifests, no queue/worker infrastructure fou… | Scalability | — | △ |
| **Performance Targets**: — no SLA, latency target, or load-test artifact found in the repository. | Scalability | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- Key Design Decisions: Rationale**: — no ADR or comment states the migration plan explicitly; the `base.module.ts:70` comm…
- Security Overview: **Data Encryption**: Passwords hashed with bcrypt, 10 salt rounds (`hashing.service.ts:4-12`). JWT…
- Scalability: **Scaling Strategy**: — no autoscaling config, no k8s manifests, no queue/worker infrastructure fou…
- Scalability: **Performance Targets**: — no SLA, latency target, or load-test artifact found in the repository.

## Risk Flags

- Low citation coverage (0%) -- most claims are marker-tagged, not cited.
