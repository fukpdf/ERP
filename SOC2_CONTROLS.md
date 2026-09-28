# SOC 2 Controls Mapping

Trust Services Criteria (Security, and relevant parts of Availability
if in scope) mapped to what exists in this delivery.

| Criterion | Control | Status |
|---|---|---|
| CC6.1 Logical access controls | RBAC (M3.3), MFA enforcement (`MfaRequiredGuard`) | MFA guard implemented; RBAC is M3.3's |
| CC6.6 Encryption | AES-256-GCM, Argon2id, TLS | Primitives implemented; TLS is infra-layer (M14) |
| CC6.7 Data transmission security | TLS 1.3 | Infra-layer, not this module |
| CC6.8 Malware prevention | Container scanning, image signing | Scripts written, not run against real images |
| CC7.1 Vulnerability detection | SAST/DAST/SCA in CI | Configured, not executed against a real app |
| CC7.2 Anomaly detection & response | Brute-force detector, impossible-travel/unusual-time heuristics | Implemented and tested |
| CC7.3 Incident evaluation | Incident response process | Documented; automation service not built |
| CC7.4 Incident response execution | IR playbooks | Documented |
| CC8.1 Change management | CI/CD gates (security.yml) | Workflow written, git-log-based evidence collection not built |
| CC9.2 Vendor management | — | Not addressed in this module (org-level responsibility) |

## SOC 2 evidence automation
The spec calls for automated evidence collection
(`soc2-evidence.service.ts`, `/v1/security/soc2/evidence`) covering
access reviews, change management, incident logs, monitoring alerts,
backup verification, encryption status, training completion, vendor
management, and risk assessments. **None of this automation is
implemented in this slice** — it would require read access to systems
(git history, M14's monitoring, HR's training records) far outside
this isolated package's scope. This document itself can serve as the
manual starting point for a SOC 2 Type I readiness assessment, but an
actual audit requires an accredited CPA firm's engagement — this
module cannot produce that.

## Target
SOC 2 Type I at launch, Type II 6 months post-launch, per the
amendment. **Current readiness: not ready** — most controls above are
either infra-layer (owned elsewhere) or documented-but-unautomated.
