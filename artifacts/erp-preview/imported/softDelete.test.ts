import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient, createTenantWithCompany, withTenantContext } from './test-db.helper';

describe('Soft delete', () => {
  let prisma: PrismaClient;
  let tenant: { tenantId: string; companyId: string };

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    tenant = await createTenantWithCompany(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('setting deletedAt hides the row from a default (deletedAt: null) query', async () => {
    await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.update({
        where: { id: tenant.companyId },
        data: { deletedAt: new Date() },
      }),
    );

    const visible = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findFirst({ where: { id: tenant.companyId, deletedAt: null } }),
    );
    expect(visible).toBeNull();

    // The row still physically exists — this is a soft delete, not a real one.
    const stillExists = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.findUnique({ where: { id: tenant.companyId } }),
    );
    expect(stillExists).not.toBeNull();
    expect(stillExists?.deletedAt).not.toBeNull();

    // restore for any other test that might reuse this fixture
    await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.company.update({ where: { id: tenant.companyId }, data: { deletedAt: null } }),
    );
  });
});
