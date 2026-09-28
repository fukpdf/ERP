# Playbook: Ransomware

## Trigger
Encrypted/inaccessible data with a ransom demand, or detection of
ransomware behavior (mass file encryption pattern, known ransomware
process signatures) before a demand is even received.

## Immediate actions
1. **Isolate immediately** — disconnect/quarantine the affected
   host(s) from the network before the encryption process can spread
   further. In a containerized environment, this means killing and
   not restarting the affected pod, and checking whether it could
   have reached shared storage/database connections.
2. Do NOT pay the ransom as a first response — that decision involves
   legal, executive leadership, and possibly law enforcement, never
   made unilaterally by the on-call engineer.
3. Assess backup integrity — per the DR targets (RPO < 15 min), verify
   the most recent clean backup and whether it predates the
   compromise (ransomware sometimes sits dormant before triggering).

## Recovery
- Restore from verified-clean backups rather than attempting
  decryption.
- Full credential rotation for anything the affected host had access
  to.
- Forensic review before returning the restored environment to
  production, to confirm the entry point is closed.

## Reporting
Ransomware incidents typically require law enforcement notification
(FBI IC3 in the US) and may trigger the same regulatory breach
notification obligations as a data breach if data was also
exfiltrated (double-extortion ransomware) — coordinate with legal.
