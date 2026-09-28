# Security Documentation — M15

This is the security documentation set for the ERP platform, covering
both control-plane and customer-environment security per the SaaS
amendment. Start here, then follow links below by topic.

## Status at a glance

See MANIFEST.md at the repo root for the authoritative, honest status
of every control (implemented / documented-only / not started). In
summary:
- **Implemented in code** (this delivery): security headers, CSRF,
  encryption primitives, password hashing, session management,
  rate limiting, brute-force protection, basic anomaly heuristics,
  PII masking, SSRF URL allowlisting.
- **Documented, not yet implemented in code**: Vault/HSM client wiring,
  vulnerability tracker service, SOC2 evidence automation, WAF/DDoS
  (IaC written, not applied), IP reputation service.
- **Not done at all, requires live infra/third parties**: actual
  penetration test, actual chaos experiment runs, actual load test,
  bug bounty program launch, SOC 2 audit itself.

## Index

- [THREAT_MODEL.md](./THREAT_MODEL.md) — STRIDE analysis per major component
- [OWASP_TOP_10.md](./OWASP_TOP_10.md) — control-by-control audit
- Application security: [CSRF.md](./CSRF.md), [XSS.md](./XSS.md),
  [SQL_INJECTION.md](./SQL_INJECTION.md), [SSRF.md](./SSRF.md),
  [XXE.md](./XXE.md), [INSECURE_DESERIALIZATION.md](./INSECURE_DESERIALIZATION.md),
  [BROKEN_ACCESS_CONTROL.md](./BROKEN_ACCESS_CONTROL.md)
- Identity: [AUTHENTICATION.md](./AUTHENTICATION.md),
  [AUTHORIZATION.md](./AUTHORIZATION.md),
  [SESSION_MANAGEMENT.md](./SESSION_MANAGEMENT.md)
- Data: [CRYPTOGRAPHY.md](./CRYPTOGRAPHY.md),
  [DATA_ENCRYPTION.md](./DATA_ENCRYPTION.md),
  [DATA_MASKING.md](./DATA_MASKING.md),
  [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md),
  [KEY_ROTATION.md](./KEY_ROTATION.md)
- Platform: [RATE_LIMITING.md](./RATE_LIMITING.md),
  [DDOS_PROTECTION.md](./DDOS_PROTECTION.md), [WAF.md](./WAF.md),
  [BOT_PROTECTION.md](./BOT_PROTECTION.md), [ZERO_TRUST.md](./ZERO_TRUST.md)
- Operations: [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) +
  [IR_PLAYBOOKS/](./IR_PLAYBOOKS/), [VULNERABILITY_MANAGEMENT.md](./VULNERABILITY_MANAGEMENT.md)
- Assurance: [PEN_TEST_PLAN.md](./PEN_TEST_PLAN.md),
  [PEN_TEST_REPORT.md](./PEN_TEST_REPORT.md), [BUG_BOUNTY.md](./BUG_BOUNTY.md),
  [SECURITY_TRAINING.md](./SECURITY_TRAINING.md)
- Compliance: [SOC2_CONTROLS.md](./SOC2_CONTROLS.md),
  [ISO27001_CONTROLS.md](./ISO27001_CONTROLS.md),
  [HIPAA_CONTROLS.md](./HIPAA_CONTROLS.md), [PCI_DSS_CONTROLS.md](./PCI_DSS_CONTROLS.md)
- Supply chain: [SBOM.md](./SBOM.md), [SLSA.md](./SLSA.md), [HSM.md](./HSM.md)
- [SECURITY_SCORECARD.md](./SECURITY_SCORECARD.md) — honest current-state scorecard
- [DISCLOSURE_POLICY.md](./DISCLOSURE_POLICY.md) — for external researchers
