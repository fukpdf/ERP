import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient, createTenantWithCompany, withTenantContext } from './test-db.helper';

/**
 * M2 ships the `version` column + the DB trigger that bumps it on every
 * UPDATE (migration 02's touch_updated_at_and_version). Actually USING
 * that column to reject a stale write is a one-line pattern
 * (`WHERE id = ? AND version = ?`, then check the affected row count) that
 * belongs in each business module's service layer, not generically here —
 * there's no generic "update" service in M2 to test. This suite proves the
 * building block those services will rely on actually works.
 */
describe('Optimistic locking (version column)', () => {
  let prisma: PrismaClient;
  let tenant: { tenantId: string; companyId: string };

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    tenant = await createTenantWithCompany(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('a normal update increments version via the DB trigger', async () => {
    const before = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findUniqueOrThrow({ where: { id: tenant.companyId } }),
    );
    expect(before.version).toBe(1);

    const after = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.update({ where: { id: tenant.companyId }, data: { tradeName: 'Test Co Trading' } }),
    );
    expect(after.version).toBe(2);
  });

  it('an update conditioned on a stale version affects zero rows (the conflict-detection pattern)', async () => {
    const current = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findUniqueOrThrow({ where: { id: tenant.companyId } }),
    );
    const staleVersion = current.version - 1;

    const result = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.updateMany({
        where: { id: tenant.companyId, version: staleVersion },
        data: { tradeName: 'Should not apply' },
      }),
    );

    expect(result.count).toBe(0);

    const unchanged = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findUniqueOrThrow({ where: { id: tenant.companyId } }),
    );
    expect(unchanged.tradeName).not.toBe('Should not apply');
  });

  it('an update conditioned on the CURRENT version succeeds', async () => {
    const current = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findUniqueOrThrow({ where: { id: tenant.companyId } }),
    );

    const result = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.updateMany({
        where: { id: tenant.companyId, version: current.version },
        data: { tradeName: 'Correctly Applied' },
      }),
    );

    expect(result.count).toBe(1);
  });
});
