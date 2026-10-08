# Universal ERP Security Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Enterprise Defense-in-Depth, Zero-Trust Security Architecture  
**Standards:** OWASP ASVS Level 3, SOC 2 Type II, ISO 27001, HIPAA & GDPR Compliance

---

## 1. Zero-Trust Security Model

The Universal ERP platform enforces a **Zero-Trust Security Perimeter**. Every network boundary, inter-service call, database connection, and user interaction must be authenticated, authorized, and logged with cryptographic certainty.

```
[ Untrusted Client ] ──► [ Edge WAF & DDoS Shield ]
                                    │ (TLS 1.3 Strict)
                                    ▼
                         [ API Gateway & Ingress ]
                         ├── Rate Limiter (Token Bucket)
                         ├── Security Headers Enforcer
                         ├── CSRF & CORS Validator
                         └── JWT Session Authenticator
                                    │ (mTLS / Signed Service Token)
                                    ▼
                         [ ERP Service / Module ]
                         ├── Tenant Context Guard (AsyncLocalStorage)
                         ├── RBAC / ABAC Permission Evaluator
                         ├── Separation of Duties (SoD) Validator
                         └── Field-Level PII Masking Filter
                                    │ (Parameterized Query + RLS)
                                    ▼
                         [ PostgreSQL Database ]
```

---

## 2. Authentication & Identity Lifecycle

1. **Password Security:** Password hashes use **Argon2id** (memory cost: 64MB, time cost: 3 iterations, parallelism: 4) or `bcryptjs` (work factor: 12) with zero plaintext retention.
2. **Session Architecture:**
   - Stateless **Access Tokens (JWT)**: Short-lived (15 minutes), signed using asymmetric keys (`Ed25519` or `RS256`).
   - Stateful **Refresh Tokens**: Long-lived (7 days), stored in encrypted database store with automatic **Token Rotation and Reuse Detection** (if a revoked refresh token is presented, all sessions for that family are immediately invalidated).
   - Cookies: Set with `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/`.
3. **Multi-Factor Authentication (MFA):**
   - Time-based One-Time Passwords (TOTP per RFC 6238) and FIDO2 / WebAuthn hardware security keys.
4. **Federated Enterprise SSO:**
   - SAML 2.0 and OpenID Connect (OIDC) integration supporting Okta, Microsoft Entra ID (Azure AD), Google Workspace, and Ping Identity.

---

## 3. Authorization: Hierarchical RBAC, ABAC & SoD

```
User ──► Assigned Roles ──► Permissions (e.g., 'sales.order.create')
               │
               ▼ (Contextual Modifiers)
    [ ABAC Policy Engine ]
    (e.g., user.cost_center == order.cost_center AND order.amount < $50,000)
               │
               ▼ (Integrity Guard)
    [ Separation of Duties (SoD) ]
    (e.g., order.creator_id != order.approver_id)
```

1. **Hierarchical RBAC:** Fine-grained permissions (e.g., `procurement.po.create`, `procurement.po.approve`, `procurement.po.cancel`). Roles can inherit from other roles.
2. **Separation of Duties (SoD):** Built-in conflict matrices prevent toxic combinations of authority:
   - Creator of a Purchase Order cannot approve that Purchase Order.
   - User with Bank Account Management cannot initiate Electronic Payment Runs.
   - User with Inventory Adjustment cannot execute Inventory Physical Write-Offs.
3. **Time-Bounded Delegations:** Users can delegate their operational authorities to colleagues during absences with strict start and expiration timestamps, fully logged for audit.

---

## 4. Application Security Controls

| Threat / Vulnerability | Architectural Defense Mechanism |
| :--- | :--- |
| **SQL Injection (SQLi)** | 100% Parameterized queries via Drizzle ORM and typed SQL builders. Raw string concatenation in queries is strictly prohibited by static analysis linters. |
| **Cross-Site Scripting (XSS)** | React automatic JSX escaping, strict Content Security Policy (`CSP: default-src 'self'`), sanitization of all HTML inputs via DOMPurify. |
| **Cross-Site Request Forgery (CSRF)** | SameSite=Strict cookies + Cryptographic Double-Submit Cookie / Anti-CSRF header verification for all state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`). |
| **Server-Side Request Forgery (SSRF)** | Outbound webhooks and URL fetching strictly validated against a private RFC 1918 IP blocklist (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254`). DNS rebinding defense via pre-connection IP resolution. |
| **Rate Limiting & Brute Force** | Token bucket algorithm: 100 req/min per IP on public endpoints; 5 failed login attempts per account triggers progressive backoff and account lock. |
| **Security Headers** | Mandatory injection: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |

---

## 5. Cryptography, Key Rotation & PII Protection

1. **Envelope Encryption:** Sensitive database fields (SSNs, National IDs, Credit Cards, Bank IBANs) are encrypted using **Envelope Encryption**:
   - Data is encrypted with a unique Data Encryption Key (DEK) using `AES-256-GCM`.
   - The DEK is encrypted with a Key Encryption Key (KEK) managed in a Cloud KMS or Hardware Security Module (HSM).
2. **Dynamic PII Masking:** Presentation layers automatically mask sensitive columns (e.g., showing `****-****-****-1234` or `XXX-XX-6789`) unless the requesting user possesses explicit clearance (`sec.data.unmask_pii`).
3. **Cryptographic Erasure (Right to be Forgotten):** Under GDPR, when a customer exercises their right to erasure, their individual master key is destroyed from the key ring, rendering all historical encrypted PII mathematically unrecoverable while preserving relational accounting integrity.
