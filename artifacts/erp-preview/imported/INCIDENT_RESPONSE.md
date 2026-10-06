# Incident Response

## Roles
- **Incident Commander (IC)** — owns the response, makes final calls,
  not necessarily the most technical person in the room.
- **Communications Lead** — internal Slack updates, external status
  page/customer comms, regulatory notification coordination.
- **Technical Lead** — drives investigation and remediation.
- **Scribe** — timestamps every action and decision in real time, for
  the post-incident review and any regulatory/legal need.

## Phases

1. **Detection** — via monitoring alert (M14), anomaly detection
   (this module), user report, or pen test/bug bounty finding.
2. **Triage** — assign severity (CRITICAL/HIGH/MEDIUM/LOW), determine
   scope (how many tenants/users affected, what data), assign IC.
3. **Containment** — isolate the affected component (revoke a
   compromised credential, block an IP/account, take a compromised
   service instance out of rotation) without destroying forensic
   evidence.
4. **Eradication** — remove the root cause (patch the vulnerability,
   rotate all potentially-exposed credentials).
5. **Recovery** — restore normal service, verify with health checks
   and, if data was affected, data-integrity checks.
6. **Post-incident review** — blameless retro within 5 business days;
   document root cause, timeline, what worked, what to fix
   structurally (not just the immediate bug).

## Communication
- **Internal**: dedicated incident Slack channel, named `#incident-<id>`.
- **External**: status page update within the timeframe committed in
  `docs/launch/SLA_DEFINITIONS.md`; customer email for anything
  affecting their data or availability materially.
- **Regulatory**: GDPR breach notification within 72 hours of becoming
  aware, where applicable (coordinate with legal — M13's Compliance
  module owns the notification-workflow implementation; this module
  produces the `security.breach.notification.sent` event as a trigger
  for it, per the event list in this module's scope).

## Status
This is a process document, not automation. The `SecurityIncident`
Prisma model (this module) gives a place to record incidents;
`incident-response.service.ts` (listed in the file plan) — the service
that would actually drive the state machine described above and emit
the `security.incident.*` events — is **not implemented** in this
slice. See MANIFEST.md.

See also: `docs/security/IR_PLAYBOOKS/` for scenario-specific runbooks.
