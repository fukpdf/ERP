# ISO 27001 Controls Mapping (Annex A, selected)

| Control | Description | Status |
|---|---|---|
| A.5 | Information security policies | Not drafted — organizational, not code |
| A.8 | Asset management | SBOM (SBOM.md) covers software assets; hardware/data asset inventory not addressed here |
| A.9 | Access control | RBAC (M3.3), MFA enforcement (this module) |
| A.10 | Cryptography | CRYPTOGRAPHY.md, primitives implemented |
| A.12 | Operations security | Scanning/CI pipeline (security.yml) |
| A.13 | Communications security | TLS/mTLS (infra-layer) |
| A.14 | System acquisition/development | Semgrep SAST rules, secure-by-default headers |
| A.16 | Incident management | INCIDENT_RESPONSE.md, IR_PLAYBOOKS/ |
| A.17 | Business continuity | DR drill plan (docs/launch/DR_DRILL_RESULTS.md), not yet executed |
| A.18 | Compliance | This document itself, plus HIPAA/PCI/SOC2 docs |

## Target
12 months post-launch, per the amendment. **Current status: early —**
this is a first-pass control mapping, not a completed Statement of
Applicability or a management-system review, both of which are
organizational (ISMS) work products outside what code/docs alone can
satisfy. An actual ISO 27001 certification requires a certification
body audit.
