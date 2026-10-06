# Playbook: API Abuse

## Trigger
Rate-limit alerts, anomaly detection flagging "unusual API patterns"
(scanning/fuzzing behavior), or a spike in errors from one API key/tenant.

## Immediate actions
1. Identify the source: API key, IP, or account. Check whether it's a
   legitimate integration gone wrong (e.g., a customer's script in an
   infinite retry loop) vs. malicious probing.
2. If malicious: revoke the API key / block the IP at the WAF
   (see `infra/security-hardening/waf/`), don't just rely on
   rate-limit throttling if the volume is impacting other tenants.
3. If a legitimate-but-misbehaving integration: reach out to the
   customer, offer to help fix their integration, temporarily raise
   or lower their rate limit as appropriate.

## Investigation
Check whether the abuse pattern found anything (successful IDOR probe,
successful injection attempt) — API abuse that's "just" high volume is
a availability concern, but scanning/fuzzing patterns should also be
checked against the Vulnerability tracker in case something was found.

## Follow-up
If the abused endpoint had no rate limit or a rate limit too generous
for its cost (e.g., an expensive export/report endpoint), tighten it
specifically rather than relying only on the global default.
