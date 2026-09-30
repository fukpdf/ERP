# Phase 6 Compliance Mapping

| Control | Evidence | State |
|---|---|---|
| OWASP headers/CSP | packages/security/src/headers.ts + tests | Implemented; static verification required |
| CSRF | packages/security/src/csrf.ts + tests | Implemented; static verification required |
| Cryptography | packages/security/src/crypto.ts | Implemented; static verification required |
| Password storage | packages/security/src/password.ts | Implemented; static verification required |
| Rate limiting | packages/security/src/rate-limit.ts | Implemented; static verification required |
| PII/credential masking | packages/security/src/pii.ts | Implemented; static verification required |
| SSRF | packages/security/src/ssrf.ts | Implemented; live network verification still required |
| Secret scanning | tools/security/scan-source.mjs | Implemented; static verification required |
| WAF/DDoS | deployment architecture/docs | Blocked until deployed |
| Vulnerability management | process documentation | Documented-only; live tracker integration absent |
| SBOM/SLSA | existing docs; lockfile/provenance gap | Blocked |
| SOC 2 / ISO 27001 / HIPAA | control documentation | Documented-only / external audit |
| Independent penetration test | PEN_TEST_PLAN.md | Blocked |
