# HIPAA Controls (Security Rule Technical Safeguards, 45 CFR § 164.312)

| Safeguard | Requirement | Status |
|---|---|---|
| Access control | Unique user IDs, RBAC, emergency access procedure | M3.3 (RBAC) + break-glass Vault role (this module) |
| Audit controls | Log PHI access | M3.5's responsibility; this module's log masking prevents PHI *leaking into* logs but doesn't itself implement PHI-access audit logging |
| Integrity | Tamper-evidence for PHI | AES-256-GCM is authenticated encryption — tampering fails auth-tag verification |
| Transmission security | Encrypt PHI in transit | TLS 1.3, infra-layer |
| Encryption at rest | PHI fields encrypted | `encrypt()`/`decrypt()` implemented; which specific columns are PHI is a data-classification task for the business modules storing health data, not enumerated here |

## Business Associate Agreements (BAA)
BAA management (tracking which vendors/sub-processors have signed
BAAs, required before any PHI can flow to them) is a legal/ops
process, not a code deliverable — not addressed in this module.

## Breach notification
HIPAA breach notification (60-day individual notification, HHS
notification, and media notification for breaches affecting 500+
individuals) is coordinated through the same
`security.breach.notification.sent` event and M13's compliance
workflow referenced in INCIDENT_RESPONSE.md — the HIPAA-specific
timeline and thresholds differ from GDPR's 72-hour rule and should be
encoded explicitly in that workflow (M13's scope, not verified here).

## Status: partial technical control implementation; PHI data
classification, BAA management, and audit-log-for-PHI-access are
flagged gaps requiring cross-module and legal/ops work.
