# Playbook: Data Breach

## Trigger
Confirmed or strongly suspected unauthorized access to customer data
(PII, PHI, financial data, or credentials).

## Immediate actions (first 30 minutes)
1. Declare incident, assign IC, open `#incident-<id>`.
2. Contain: revoke the access path used (API key, compromised
   credential, vulnerable endpoint taken offline/patched-forward).
3. Preserve evidence: snapshot logs, do not delete/rotate anything
   that might be needed for forensics before the Technical Lead has
   captured it.
4. Determine scope: which tenant(s), which data fields, how many
   records, what time window — cross-reference audit logs (M3.5).

## Within 24 hours
- Legal + Communications Lead assess regulatory notification
  obligations (GDPR 72h, HIPAA breach notification rule, state breach
  laws) — coordinate with M13 Compliance module's breach-notification
  workflow.
- Prepare customer communication, factual and specific about what's
  known and not yet known — avoid speculation.

## Within 72 hours
- Regulatory notification filed if required.
- Affected customers notified per contractual/legal SLA.

## Eradication & recovery
- Patch the root cause, rotate every credential that could have been
  exposed (not just the one confirmed used).
- Verify no persistence mechanism was left behind (new admin account,
  API key, webhook).

## Post-incident
- Full timeline reconstruction, root cause analysis, and a specific
  action-item list with owners and due dates — tracked to closure, not
  just written down.
