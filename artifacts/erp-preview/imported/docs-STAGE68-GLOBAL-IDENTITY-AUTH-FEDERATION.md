# Stage 68 — Global Identity, Authentication Federation and Control-Plane Authorization Integrity Gate

## Objective
Establish a provider-neutral identity boundary for Sisoft's global control plane and regional data planes. Authentication proves identity; authorization separately proves what that identity may do for a specific tenant, control-plane resource and placement context.

## Identity boundaries
- A stable identity subject does not itself grant access to any tenant.
- Tenant context must be explicit, authorized and bound to the requested operation.
- A tenant administrator cannot elevate to a global operator by changing claims or request headers.
- Cross-tenant identity enumeration is forbidden unless a narrowly scoped global operator workflow explicitly authorizes it.
- User identity, tenant identity, service identity and provider identity are separate concepts.

## OIDC and SAML federation
OIDC providers require an issuer allowlist, authorization-code/nonce or state validation as applicable, signature validation, audience validation, expiry checks and explicit subject mapping. SAML adapters require trusted entity/issuer configuration, signed assertion validation, audience/destination/recipient checks and replay protection.

Provider-specific behavior belongs inside federation adapters. Control-plane lifecycle and authorization logic must not depend directly on Oracle, Azure, AWS, GCP or any provider-specific identity API.

## Token and placement context
- Validate issuer, audience, signature algorithm, time claims and token status before authorization.
- Tenant claims are inputs to authorization, not proof of authorization.
- Region claims cannot override the authoritative tenant placement record.
- Placement version/fencing context must be checked for placement-sensitive commands.
- Service-to-service calls require a distinct service identity and least-privilege authorization.
- Sensitive replayable commands require an idempotency/replay control.

## Control-plane RBAC and SoD
Global control-plane roles are separate from tenant application roles. High-impact actions such as tenant movement, deprovisioning, identity-provider changes, key management and break-glass access require explicit permissions and separation-of-duties where configured. Privileged actions are auditable and carry actor, service, tenant, resource, reason, authorization decision and correlation identifiers.

## Key lifecycle
Signing/encryption keys require versioning and controlled rotation. A rotation uses an overlap period in which old and new public keys may be verified, followed by retirement/disablement of the old key. Unknown, disabled or revoked keys fail closed. Private key material must never appear in logs, audit payloads or application error messages.

## Session security
Browser sessions require secure cookie attributes and appropriate CSRF defenses when cookie authentication is used. Session fixation is rejected, logout/revocation has a defined contract, and session state cannot silently change tenant authority.

## Break-glass access
Emergency access is explicitly scoped, time-limited, attributable and audited. Break-glass must not become a permanent role or bypass tenant isolation. Expired emergency grants are rejected automatically.

## Runtime gate
Static verification checks the policy and documentation contracts. Runtime PASS requires representative OIDC/SAML providers, real token/key infrastructure, service identities, control-plane RBAC/SoD, key rotation/revocation, break-glass expiry and regional failover tests. Without that infrastructure, runtime remains BLOCKED.
