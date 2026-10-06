# Data Encryption

## At rest
- Field-level encryption for PII/PHI/financial fields using AES-256-GCM
  (`packages/security/src/crypto/encrypt.ts`). Which specific columns
  need field-level encryption (SSNs, medical record fields, bank
  account numbers) is a data-classification exercise owned jointly
  with each business module — not enumerated exhaustively here since
  those schemas live in M4-M9's isolated scope.
- Volume/disk-level encryption (AES-256) for databases and backups is
  an infra-layer control (cloud provider EBS/managed-DB encryption,
  M14's responsibility) — not re-implemented here.

## In transit
- TLS 1.3 required for all external traffic; TLS 1.2 minimum fallback
  for any client that can't negotiate 1.3.
- mTLS between services within the cluster (M14 Istio service mesh).
- Enforced via ingress/load-balancer TLS policy, not application code.

## Key management
See KEY_ROTATION.md and SECRETS_MANAGEMENT.md. Encryption keys
themselves are never stored alongside the ciphertext they protect.

## Backup encryption
Backups inherit at-rest encryption from the underlying storage (M14).
This module does not re-encrypt backups separately — a second
encryption layer would only make sense if backups are stored outside
the primary cloud provider's encrypted storage (e.g., exported to a
different provider for DR), which isn't the case for the DR topology
described in M14.

## Status: primitives implemented and tested; the data-classification
mapping of which fields get field-level encryption, and the
backup/volume encryption verification, are infra/business-module
responsibilities not completed as part of this isolated slice.
