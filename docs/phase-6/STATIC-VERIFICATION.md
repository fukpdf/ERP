# Phase 6 Static Verification

Required repository checks: pnpm typecheck; pnpm test; pnpm prisma validate; pnpm security:scan.

The security package is covered by packages/security/security.test.ts. The source scanner checks committed source for common private-key, cloud-key, and hard-coded credential patterns.

A PASS here means only that the repository checks executed successfully. It does not prove live HTTP, database, Redis, WAF, DNS-rebinding, penetration-test, or compliance-audit behavior.