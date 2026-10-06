import { PrismaClient } from '@prisma/client';
import {
  createTestPrismaClient,
  createTenantWithCompany,
  withTenantContext,
} from './test-db.helper';

/**
 * Requires a live Postgres with schema pushed and 01/02/03 raw-sql applied
 * (see README-M2.md "Running the DB test suite"). Run with: `pnpm test:db`.
 *
 * This suite connects as `erp_app` (see test-db.helper.ts), the same
 * non-superuser role the real application uses — a pass here proves the
 * DATABASE enforces isolation, not just application code sitting on top of
 * a superuser connection that would bypass RLS entirely.
 */
describe('Row-Level Security: tenant isolation', () => {
  let prisma: PrismaClient;
  let tenantA: { tenantId: string; companyId: string };
  let tenantB: { tenantId: string; companyId: string };

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    tenantA = await createTenantWithCompany(prisma);
    tenantB = await createTenantWithCompany(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('tenant A can see its own company when context is set to A', async () => {
    const companies = await withTenantContext(prisma, tenantA.tenantId, (tx) =>
      tx.company.findMany({ where: { id: tenantA.companyId } }),
    );
    expect(companies).toHaveLength(1);
  });

  it('tenant A CANNOT see tenant B company when context is set to A', async () => {
    const companies = await withTenantContext(prisma, tenantA.tenantId, (tx) =>
      tx.company.findMany({ where: { id: tenantB.companyId } }),
    );
    expect(companies).toHaveLength(0);
  });

  it('a query with NO tenant context set returns zero rows, not all rows', async () => {
    const companies = await withTenantContext(prisma, null, (tx) => tx.company.findMany({}));
    expect(companies).toHaveLength(0);
  });

  it('tenant B cannot update a row belonging to tenant A', async () => {
    const result = await withTenantContext(prisma, tenantB.tenantId, (tx) =>
      tx.company.updateMany({
        where: { id: tenantA.companyId },
        data: { legalName: 'Hijacked' },
      }),
    );
    expect(result.count).toBe(0);

    // Prove it truly wasn't touched, viewed correctly from A's own context.
    const stillA = await withTenantContext(prisma, tenantA.tenantId, (tx) =>
      tx.company.findFirst({ where: { id: tenantA.companyId } }),
    );
    expect(stillA?.legalName).toBe('Test Co');
  });

  it('every table with a tenantId column has RLS enabled', async () => {
    const rows = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          SELECT table_name FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name = 'tenantId'
        )
    `;
    const withoutRls = rows.filter((r) => !r.rowsecurity);
    expect(withoutRls).toEqual([]);
  });
});
