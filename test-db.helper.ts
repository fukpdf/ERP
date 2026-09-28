import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * Shared by every test in test/db/. Requires a real Postgres reachable via
 * DATABASE_URL, with schema.prisma pushed and 01/02 raw-sql applied — see
 * README-M2.md "Running the DB test suite". These tests intentionally use
 * a bare, unextended PrismaClient (not the tenant-scoping extension) so
 * they can prove what the DATABASE itself enforces via RLS, independent of
 * whether the application-layer extension also happens to be correct.
 */
export function createTestPrismaClient(): PrismaClient {
  // Deliberately the erp_app (non-superuser) connection, same as the real
  // running app — connecting as the migration superuser here would make
  // every assertion in this suite pass trivially (superusers bypass RLS),
  // proving nothing. See infra/postgres/init.sql and MULTI_TENANCY.md.
  const url = process.env.APP_DATABASE_URL;
  if (!url) {
    throw new Error(
      'APP_DATABASE_URL is not set. The DB test suite must run as the ' +
        'non-superuser erp_app role, not the migration superuser — see ' +
        '.env.example and README-M2.md "Running the DB test suite".',
    );
  }
  return new PrismaClient({ datasources: { db: { url } } });
}

/**
 * `SET LOCAL`/`set_config(..., true)` only lasts for the current
 * transaction, and Prisma may hand separate top-level calls different
 * pooled connections — so setting tenant context only means anything
 * inside a single `$transaction`. This helper runs the whole test body
 * inside one, mirroring exactly what PrismaService.withTenant() does in
 * the real application (see apps/api/src/prisma/prisma.service.ts).
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId ?? ''}, true)`;
    return fn(tx as unknown as PrismaClient);
  });
}

export function newTenantId(): string {
  return randomUUID();
}

const SYSTEM_USER_ID = randomUUID();

/**
 * Creates a Tenant (never RLS-restricted — it has no tenantId column, it
 * IS the tenant registry) plus one Company row scoped to it (RLS-restricted
 * with FORCE ROW LEVEL SECURITY). Must run inside its own transaction that
 * sets `app.current_tenant` to the just-created tenant's own id BEFORE
 * inserting the Company row, or the insert is rejected by the
 * tenant_isolation policy's implicit WITH CHECK (no context = no tenant
 * equals the new row's tenantId = insert denied) — this is RLS working
 * correctly, not a bug to route around; real tenant provisioning code
 * hits the exact same requirement (see PrismaService.withBypassRls() for
 * how production code satisfies it instead of a raw set_config call).
 */
export async function createTenantWithCompany(
  prisma: PrismaClient,
): Promise<{ tenantId: string; companyId: string }> {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: `Test Tenant ${randomUUID()}`, slug: `test-${randomUUID()}` },
    });

    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;

    const company = await tx.company.create({
      data: {
        tenantId: tenant.id,
        legalName: 'Test Co',
        countryCode: 'US',
        baseCurrency: 'USD',
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      },
    });

    return { tenantId: tenant.id, companyId: company.id };
  });
}

export { SYSTEM_USER_ID };
