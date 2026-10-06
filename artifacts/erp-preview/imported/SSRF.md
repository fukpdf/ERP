# SSRF Prevention

## Implementation

`packages/security/src/input/url-allowlist.ts` — `checkOutboundUrl()`:

- Requires `https:` only.
- Requires the hostname to be in a caller-supplied allowlist (e.g.,
  known webhook partner domains).
- If the hostname is a literal IP, blocks RFC1918 ranges
  (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), link-local
  (169.254.0.0/16, including the cloud metadata IP
  169.254.169.254 explicitly), and IPv6 equivalents
  (loopback, link-local, unique-local).

Every outbound HTTP call built from user-controlled input (webhook
target URLs, "fetch this image from a URL" features, etc.) must call
`checkOutboundUrl()` before making the request.

## Known limitation: DNS rebinding

Checking the URL's hostname against the allowlist and IP ranges at
*validation time* does not protect against DNS rebinding, where an
attacker's domain resolves to a public IP during validation and then
to `169.254.169.254` or an internal IP at actual connect time (a TTL=0
DNS trick). Full protection requires:

1. Resolving the hostname once,
2. Checking the *resolved* IP with `isPrivateOrMetadataIp()`,
3. Connecting directly to that pinned IP (not re-resolving),
4. Re-validating again after following any redirect (redirects can
   point anywhere).

This connect-time pinning has to live in whichever HTTP client the
merged API app uses (undici, axios, etc.) since it needs low-level
control over DNS resolution and connection — it's not implemented in
this isolated package. Flagged clearly here rather than silently
gapped: **do not consider SSRF fully closed until this is wired in.**

## Testing

- Unit: `url-allowlist.spec.ts` covers metadata IP, RFC1918 ranges,
  protocol enforcement, and hostname allowlisting.
- Pen test: attempt SSRF via `http://169.254.169.254/latest/meta-data/`,
  DNS rebinding domains, and redirect chains against any feature that
  accepts a URL. Not yet run (no live instance).
