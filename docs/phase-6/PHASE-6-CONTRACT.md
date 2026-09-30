# Phase 6 Contract — Security & Compliance Hardening

Scope is defined by ERP-ROADMAP.md: OWASP protections; secrets and cryptographic lifecycle; password/session security; rate limiting and bot-abuse foundations; WAF/DDoS contracts; vulnerability management; SBOM/SLSA/supply-chain controls; SOC 2, ISO 27001 and applicable HIPAA mapping; and independent penetration testing.

Non-negotiables: fail closed on invalid security input; never store plaintext passwords or secrets; preserve tenant/control-plane isolation; and never convert documentation or static checks into runtime evidence.

Exit gate: repository-fixable controls are implemented, statically checked, unit tested, and documented. Runtime/third-party gates remain explicitly BLOCKED until their required environments exist.