# Threat Model — STRIDE

STRIDE per major component. This is a first-pass analysis based on the
architecture described in the M1-M14 prompts; it has not been reviewed
in a live threat-modeling session with the other module owners, which
should happen before launch.

## Control Plane (S1)

| Threat | Scenario | Mitigation |
|---|---|---|
| Spoofing | Attacker impersonates the control plane to a customer environment | mTLS between control plane and customer envs (M14 Istio), signed orchestration requests |
| Tampering | Malicious modification of orchestration commands in transit | mTLS + request signing (HMAC), audit log of all orchestration actions |
| Repudiation | Admin denies performing a destructive action | Audit log (M3.5) with non-repudiation (signed entries), MFA-required for destructive actions |
| Information disclosure | Control-plane credentials leak, exposing all customer environments | HSM-backed key storage, no plaintext secrets, least-privilege Vault policies (see infra/security-hardening/vault) |
| Denial of service | Control plane overwhelmed, unable to manage customer environments | Rate limiting, WAF, autoscaling, isolated from customer-facing traffic |
| Elevation of privilege | Compromised customer environment attempts to reach control plane | Network policies deny customer-env -> control-plane traffic entirely except via defined orchestration API with its own auth |

## Customer Environment

| Threat | Scenario | Mitigation |
|---|---|---|
| Spoofing | Cross-tenant impersonation | RLS (M2) + JWT tenant claim verified on every request |
| Tampering | SQL injection to alter another tenant's data | Parameterized queries only (verified, see SQL_INJECTION.md) |
| Repudiation | User denies an action within their tenant | Per-tenant audit log |
| Information disclosure | Tenant A reads Tenant B's data (IDOR) | RLS + object-level authorization checks in every handler |
| Denial of service | One noisy tenant degrades others (noisy neighbor) | Per-tenant rate limiting, resource quotas (K8s, M14) |
| Elevation of privilege | Regular user escalates to tenant admin | RBAC (M3.3) checked server-side on every mutating action, not just UI-hidden |

## Authentication / Session Layer

| Threat | Scenario | Mitigation |
|---|---|---|
| Spoofing | Credential stuffing / brute force | BruteForceDetector (5/15min account, 20/15min IP), progressive delay |
| Tampering | JWT tampering | RS256 signature verification, `alg` pinned (reject `none`) |
| Repudiation | Session hijack used to deny actions | Session binding to device fingerprint (partial — see MANIFEST.md), audit log |
| Information disclosure | Session token leaked via XSS | HttpOnly cookies, CSP, output encoding |
| Denial of service | Mass account lockout via adversarial failed logins (DoS via lockout) | IP-level tracking alongside account-level, so an attacker locking one account doesn't require locking legitimate users out of others |
| Elevation of privilege | MFA bypass | MfaRequiredGuard enforced server-side on sensitive routes, session tracks `mfaVerifiedAt` |

## Data Layer (PII/PHI)

| Threat | Scenario | Mitigation |
|---|---|---|
| Information disclosure | PHI exposed in logs | Log masking by key name (`maskLogObject`), field-level encryption for PHI columns |
| Tampering | Ciphertext modified without detection | AES-256-GCM (authenticated encryption — tampering fails auth tag verification) |
| Information disclosure | Backup exfiltration | Backup encryption (relies on M14's backup infra + a KMS-managed key, not re-implemented here) |

## Known gaps in this threat model
- Does not yet cover the AI module's specific threats beyond what M10
  already addresses (prompt injection) — `apps/ai/security.py` in this
  slice is a stub, see MANIFEST.md.
- Does not cover physical/data-center threats (out of scope, handled by
  cloud provider SOC 2 reports).
- Has not been reviewed against the actual finalized M14 network
  topology, since that wasn't available to this isolated module.
