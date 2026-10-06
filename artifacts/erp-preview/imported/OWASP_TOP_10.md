# OWASP Top 10 (2021) — Audit & Fixes

Honest status per item. "Fixed" means real code exists in this delivery
and is unit-tested; "Documented" means a control is specified but not
yet wired into the running app; "Pending verification" means it
requires a live pen test / running instance to confirm.

## A01:2021 – Broken Access Control
**Status: Documented + partially implemented.**
- RBAC (M3.3) and RLS (M2) are foundation-module responsibilities, not
  rebuilt here.
- `MfaRequiredGuard` (apps/api/src/security/guards) enforces MFA on
  routes tagged `@RequireMfa()`.
- IDOR testing plan: `tools/pentest/scripts/idor-tests.sh`, checklist
  in `tools/pentest/checklist/api-testing.md`.
- **Gap:** no automated IDOR regression test exists yet against real
  endpoints (would require the merged app). Pending verification.

## A02:2021 – Cryptographic Failures
**Status: Fixed (primitives) + Documented (key management).**
- AES-256-GCM authenticated encryption implemented and tested
  (`packages/security/src/crypto/encrypt.ts`).
- Argon2id password hashing implemented and tested
  (`packages/security/src/crypto/hash.ts`).
- TLS 1.3 enforcement is an infra-layer control (load balancer /
  ingress config) — documented in DATA_ENCRYPTION.md, not re-implemented
  here since M14 owns ingress.
- HSM/Vault key storage: Terraform + policies written
  (`infra/security-hardening/hsm/`, `vault/`), not provisioned.

## A03:2021 – Injection
**Status: Fixed (by architecture) + Pending verification (live test).**
- SQL: Prisma parameterized queries only; `$queryRawUnsafe` banned by
  Semgrep rule (`tools/security/sast/semgrep-rules.yaml`).
  `looksLikeSqlInjection()` is a secondary anomaly-logging heuristic,
  NOT the primary control — see SQL_INJECTION.md.
- Command injection: no shell string-building from user input in this
  slice; `stripShellMetacharacters()` provided as defense-in-depth if
  ever needed.
- **Gap:** sqlmap has not been run against a live instance (none
  exists). Script ready at `tools/pentest/scripts/injection-tests.sh`.

## A04:2021 – Insecure Design
**Status: Documented.**
- Threat model in THREAT_MODEL.md.
- Business-logic test checklist in
  `tools/pentest/checklist/business-logic.md` (race conditions, price
  tampering, workflow bypass) — these are business-module (M4-M9)
  concerns primarily; M15 provides the testing methodology, not fixes
  to those modules (out of scope per isolation rules).

## A05:2021 – Security Misconfiguration
**Status: Fixed (headers) + Documented (rest).**
- Full security header set implemented and tested
  (`packages/security/src/headers/security-headers.ts`): HSTS, CSP with
  nonces, X-Frame-Options, COOP/COEP/CORP, Permissions-Policy.
- CORS uses a strict allowlist, never reflects arbitrary Origin
  (`resolveCorsOrigin`).
- IaC scanning configured (Checkov, tfsec) but not run against real
  infra.

## A06:2021 – Vulnerable and Outdated Components
**Status: Configured, not executed.**
- Dependency scanning scripts ready (Snyk, npm audit, pip-audit,
  Trivy filesystem scan) and wired into `security.yml` CI.
- SBOM generation via Syft configured.
- **Not run** — no real dependency tree exists in this isolated
  package slice to scan meaningfully yet.

## A07:2021 – Identification and Authentication Failures
**Status: Fixed (session/lockout) + relies on M3.1 (MFA implementation itself).**
- Brute-force lockout implemented and tested: 5 attempts/15min per
  account, 20/15min per IP, progressive delay
  (`packages/security/src/anomaly/brute-force-detector.ts`).
- Session rotation (fixation prevention), idle (15min) and absolute
  (8h) timeout implemented (`session/session-manager.ts`).
- Password policy (12+ chars, complexity, HIBP-check helper)
  implemented (`input/validators.ts`).
- MFA itself (TOTP/WebAuthn) is M3.1's responsibility; M15 adds
  *enforcement* (`MfaRequiredGuard`) on top.

## A08:2021 – Software and Data Integrity Failures
**Status: Documented, partially configured.**
- Cosign signing scripts written (keyless, Sigstore/Fulcio).
- SLSA Level 3 provenance: explicitly **not implemented** — requires a
  dedicated CI reusable workflow, documented as a gap in
  `tools/security/signing/slsa-provenance.sh` and SLSA.md.
- Insecure deserialization: no custom deserialization logic introduced
  by this module; see INSECURE_DESERIALIZATION.md for the general
  guidance given to other module owners.

## A09:2021 – Security Logging and Monitoring Failures
**Status: Documented, depends on M3.5 + M14.**
- Audit logging is M3.5's responsibility. M15 adds anomaly-specific
  event types (see the PARENT prompt's event list) and a
  `SecurityAnomalyEvent` Prisma model to store anomaly detections.
- Log masking implemented (`maskLogObject`) so PII/secrets aren't
  written to logs in the first place.
- **Gap:** no automated test verifies audit entries are actually
  written on auth failure/success in a running app — that requires
  the merged M3.5 audit service.

## A10:2021 – Server-Side Request Forgery (SSRF)
**Status: Fixed.**
- `checkOutboundUrl()` implemented and tested: hostname allowlist +
  blocks RFC1918/link-local/loopback ranges + blocks the
  169.254.169.254 cloud metadata endpoint
  (`packages/security/src/input/url-allowlist.ts`).
- **Known limitation, documented honestly:** this checks the URL at
  validation time. It does NOT by itself defend against DNS rebinding
  (hostname resolves to a public IP at check time, then to a private
  IP at connect time). Full DNS-rebinding defense requires pinning the
  resolved IP at connect time in the actual HTTP client used for
  outbound requests — not implemented in this slice, since it depends
  on which HTTP client library the merged API app uses.
