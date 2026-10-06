import { PrismaClient, AuditAction } from '@prisma/client';
import { createTestPrismaClient, createTenantWithCompany, withTenantContext } from './test-db.helper';

describe('Audit log: append-only + hash chain', () => {
  let prisma: PrismaClient;
  let tenant: { tenantId: string; companyId: string };

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    tenant = await createTenantWithCompany(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects UPDATE on audit_events (trigger from migration 02)', async () => {
    const event = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.auditEvent.create({
        data: {
          tenantId: tenant.tenantId,
          action: AuditAction.CREATE,
          entityType: 'company',
          entityId: tenant.companyId,
          after: { legalName: 'Test Co' },
          rowHash: 'placeholder',
        },
      }),
    );

    await expect(
      withTenantContext(prisma, tenant.tenantId, (tx) =>
        tx.auditEvent.update({ where: { id: event.id }, data: { reason: 'tampered' } }),
      ),
    ).rejects.toThrow(/append-only/i);
  });

  it('rejects DELETE on audit_events', async () => {
    const event = await withTenantContext(prisma, tenant.tenantId, (tx) =>
      tx.auditEvent.create({
        data: {
          tenantId: tenant.tenantId,
          action: AuditAction.UPDATE,
          entityType: 'company',
          entityId: tenant.companyId,
          rowHash: 'placeholder-2',
        },
      }),
    );

    await expect(
      withTenantContext(prisma, tenant.tenantId, (tx) => tx.auditEvent.delete({ where: { id: event.id } })),
    ).rejects.toThrow(/append-only/i);
  });

  it('audit_hash() is deterministic and chains from the previous hash', async () => {
    const [rowA] = await prisma.$queryRaw<Array<{ hash: string }>>`
      SELECT audit_hash(NULL, '{"a":1}'::jsonb) AS hash
    `;
    const [rowB] = await prisma.$queryRaw<Array<{ hash: string }>>`
      SELECT audit_hash(NULL, '{"a":1}'::jsonb) AS hash
    `;
    expect(rowA.hash).toBe(rowB.hash); // same inputs -> same hash, always

    const [rowC] = await prisma.$queryRaw<Array<{ hash: string }>>`
      SELECT audit_hash(${rowA.hash}, '{"a":2}'::jsonb) AS hash
    `;
    expect(rowC.hash).not.toBe(rowA.hash); // chaining off a different prev_hash changes the result
  });
});
