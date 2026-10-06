# Secrets Management

## Policy
No secret (API key, DB credential, encryption key, signing key) may
exist as plaintext in: source code, environment variable *default*
values, container images, or logs. Production secrets are retrieved
at runtime from HashiCorp Vault (customer environments and general
control-plane secrets) or an HSM (control-plane cryptographic keys
specifically — see HSM.md).

## Vault topology
- `infra/security-hardening/vault/policies/` — least-privilege
  policies per service (api-policy, worker-policy) plus a
  time-boxed, MFA-gated admin-policy for break-glass only.
- `infra/security-hardening/vault/auth/` — Kubernetes auth (service
  workloads authenticate via their K8s service account) and OIDC auth
  (human operators authenticate via the org's existing SSO).
- Vault client wiring (`packages/security/src/secrets/vault-client.ts`
  in the original file plan) is **not implemented** in this delivery —
  the policies and auth config are real, but the application code that
  calls Vault at runtime to fetch a secret wasn't written. This is the
  single biggest gap between "documented" and "actually running"
  in this module; flagged explicitly in MANIFEST.md.

## Runtime secret scanning
`security-scan.service.ts` (planned, not implemented) would scan
environment variables at startup and reject boot in production if any
expected-to-be-Vault-sourced variable instead contains what looks like
a raw secret value. Not built in this slice.

## Pre-commit / CI secret scanning (implemented)
- `tools/security/secret-scan/gitleaks.toml` + pre-commit hook —
  real, install with the instructions in that file.
- `tools/security/secret-scan/trufflehog.sh` — scans full git history
  for verified secrets, wired into `security.yml` CI.

## Cloud secrets managers
AWS Secrets Manager / Azure Key Vault client wrappers
(`aws-secrets.ts`, `azure-keyvault.ts` in the file plan) are
**not implemented** — listed as alternatives to Vault for customer
environments that prefer their cloud provider's native secrets store,
per the amendment's "independent security posture" language for
customer environments.
