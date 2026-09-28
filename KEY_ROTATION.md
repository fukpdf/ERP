# Key Rotation

## Cadence (per M15 spec)

| Key type | Rotation interval | Mechanism |
|---|---|---|
| JWT signing keys | 90 days | M3.1 owns generation; dual-key verification during grace period |
| Encryption keys (AES-256-GCM) | 90 days | `KeyRotationTracker` (this module) tracks active/deprecated/retired versions |
| API keys (user-managed) | Expire after 90 days | Enforcement logic not implemented in this slice |
| TLS certificates | 60 days | cert-manager (M14), auto-renew via Let's Encrypt |
| DB credentials | 90 days | Vault dynamic secrets (`database/creds/erp-api-role`) — see `worker-policy.hcl` |
| Secret values (general) | 90 days | Manual/Vault-scheduled rotation |

## Process
1. Generate new key (in Vault/HSM — not in application code).
2. Deploy with dual-key support: new key used for new encryption/signing,
   old key still accepted for decryption/verification during the grace
   period (`KeyRotationTracker.decryptable()` returns all
   non-retired versions).
3. Re-encrypt existing data under the new key asynchronously (a
   background job — not implemented in this slice; see
   `jobs/key-rotation.job.ts` in the file plan).
4. Deprecate the old key (`KeyRotationTracker.register()` auto-marks
   the previous active key as `deprecated` when a new one registers).
5. Retire and remove the old key after the grace period, once
   confirmed no ciphertext still depends on it
   (`KeyRotationTracker.retire()`).

## What's implemented vs. not

**Implemented:** the `KeyRotationTracker` state machine
(`packages/security/src/crypto/key-rotation.ts`) and its tests — pure
logic for tracking key versions and dual-key decrypt eligibility.

**Not implemented:** the actual scheduled jobs that call Vault to
generate a new key, trigger re-encryption, and update the tracker.
These require a running job scheduler (BullMQ/similar, likely already
present from another module) and live Vault access — out of reach in
this isolated, non-networked delivery.
