# Cryptography Standards

| Purpose | Algorithm | Implementation |
|---|---|---|
| Password hashing | Argon2id (memory=19MiB, time=2, parallelism=1) | `packages/security/src/crypto/hash.ts` |
| Symmetric encryption (PII/PHI fields, backups) | AES-256-GCM | `packages/security/src/crypto/encrypt.ts` |
| Message authentication (webhooks) | HMAC-SHA256 | `packages/security/src/crypto/hmac.ts` |
| Transport | TLS 1.3 (1.2 minimum fallback) | Ingress/load-balancer config, owned by M14 |
| JWT signing | RS256 | M3.1 |
| Random values (tokens, session IDs) | CSPRNG (Node `crypto.randomBytes`/`randomInt`) | `packages/security/src/crypto/random.ts` |
| Key derivation | PBKDF2 (600k iterations, SHA-256) or HKDF | `packages/security/src/crypto/key-derivation.ts` |

## Rules
- Never implement custom cryptographic primitives. Use Node's `crypto`
  module (backed by OpenSSL) exclusively.
- Never use MD5, SHA-1, DES, RC4, or ECB mode for anything
  security-relevant.
- All comparisons of secrets/tokens/HMACs use constant-time comparison
  (`timingSafeEqualStr`, `crypto.timingSafeEqual`) — never `===`.
- Key material never appears in source code, environment variable
  defaults, or logs. Retrieved from Vault/HSM at runtime only.

## Status
Primitives above are implemented and unit-tested. Runtime key
retrieval from Vault/HSM (`secrets/vault-client.ts` etc. in the file
list) is **not implemented** in this slice — see SECRETS_MANAGEMENT.md
and MANIFEST.md.
