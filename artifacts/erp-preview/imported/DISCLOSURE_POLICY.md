# Vulnerability Disclosure Policy

## For security researchers

We welcome responsible disclosure of security vulnerabilities.

**How to report**: email security@example.com (replace with the real
address before publishing) with a description, reproduction steps,
and impact assessment. Encrypt sensitive details with our PGP key
(publish a real key before launch — not generated in this delivery).

**What we ask**:
- Give us a reasonable time to investigate and remediate before public
  disclosure (90 days is a common industry standard).
- Don't access, modify, or delete data beyond what's needed to
  demonstrate the vulnerability.
- Don't test against production if a staging environment is available
  for the same functionality once the bug bounty program (BUG_BOUNTY.md)
  defines its scope.
- Don't perform denial-of-service testing.

**What we commit to**:
- Acknowledge receipt within 48 hours.
- Provide an initial assessment within 7 days.
- Credit researchers (with permission) once fixed, per the SLA in
  VULNERABILITY_MANAGEMENT.md.
- Not pursue legal action against good-faith researchers following
  this policy.

## Status
This is a policy template — replace the placeholder contact and PGP
key details before publishing externally. It should be published
publicly (e.g., at `/.well-known/security.txt` per RFC 9116) once
finalized, which is not done as part of this code delivery.
