# Stage 58 — Release-Readiness Defect Closure and Production Configuration Gate

## Objective

Close concrete application-level release defects already visible in source and establish a fail-closed production configuration gate. Do not convert infrastructure assumptions into runtime PASS claims.

## Changes

### 1. Production database least privilege

`PrismaService` now refuses to start in `NODE_ENV=production` when `APP_DATABASE_URL` is absent. The previous production fallback to `DATABASE_URL` could connect the application using the migration role and thereby undermine the intended RLS boundary.

Non-production environments may still use the fallback for development compatibility, with an explicit warning.

### 2. Boot-time configuration validation

`AppModule` now chains the existing `validateAuthConfig()` and `validateTenancyConfig()` validators through the single Nest `ConfigModule.forRoot({ validate })` hook. Production-required JWT/WebAuthn and tenant-admin configuration therefore fails during boot instead of remaining documentation-only.

### 3. Production gate

`scripts/verify-stage58-production-config.py` checks source/configuration contracts for:

- least-privilege database role
- production auth/JWT requirements
- strict origin/CSRF allowlisting
- distributed rate-limit requirement
- TLS/secrets/backup/observability contracts
- absence of committed private-key material in `.env.example`

`scripts/run-stage58-production-gate.sh` is separately guarded. It requires an explicit `STAGE58_ALLOW_RUNTIME=1`, production environment, required secrets, and explicit PostgreSQL TLS before reporting target-environment checks as passed.

## Runtime status

**BLOCKED.** This stage has not been used to fabricate PostgreSQL, Redis, backup, TLS, worker, or observability results. The environment still lacks the actual production/disposable infrastructure required for those tests.
