# Playbook: Account Compromise

## Trigger
Impossible-travel or unusual-time anomaly flagged (see
`packages/security/src/anomaly/`), user reports unrecognized activity,
or credential found in a breach dump (e.g., via HIBP monitoring).

## Immediate actions
1. Force session termination for the affected account
   (`SessionManager.destroy()` for all active sessions, not just the
   suspicious one).
2. Force password reset and require MFA re-enrollment if MFA wasn't
   already active or may itself be compromised (e.g., SIM-swap
   scenario affecting SMS-based MFA — encourage TOTP/WebAuthn instead).
3. Review the account's recent actions for anything to undo (data
   exports, changes to other users' permissions, financial actions).
4. Check whether the same credential was reused to access other
   accounts (same IP/device fingerprint pattern).

## Customer communication
Notify the affected user directly; only escalate to broader customer
communication if the compromised account had access to affect other
tenants (e.g., a customer's own admin account was compromised — that's
their incident to communicate internally, coordinate on messaging with
them).

## Follow-up
If the pattern suggests credential stuffing from a breach dump rather
than a targeted attack, consider proactively forcing a password reset
for other accounts using the same breached password (via the
`isPasswordPwned` check at next login).
