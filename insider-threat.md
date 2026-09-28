# Playbook: Insider Threat

## Trigger
Anomalous access pattern by an employee/contractor account (mass data
export, access to records outside their normal scope, access outside
normal hours combined with sensitive-data access) or a direct report
of suspected misuse.

## Immediate actions
1. This playbook requires more discretion than others — involve HR
   and Legal from the start, not just the security/engineering team.
   Do not confront the individual before HR/Legal have weighed in.
2. Preserve evidence quietly: pull relevant audit logs
   (`SecurityAnomalyEvent`, M3.5 audit log) without altering the
   employee's access yet if doing so would tip them off during an
   active investigation — unless there's ongoing active harm, in
   which case contain first (revoke access) per IC judgment.
3. Determine scope: what data was accessed/exported, over what time
   window.

## Containment
Once HR/Legal approve action: revoke access, rotate any credentials
they held, preserve their device/account state for forensic review
rather than wiping it immediately.

## Sensitivity note
This playbook intersects with employment law and potentially criminal
referral — the security team's role is technical investigation and
containment; HR/Legal own the personnel and legal process.
