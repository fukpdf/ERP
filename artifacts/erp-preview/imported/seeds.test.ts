import { PrismaClient } from '@prisma/client';
import { seedPlans } from '../../../../prisma/seed/seed-plans';
import { seedCurrencies } from '../../../../prisma/seed/seed-currencies';
import { createTestPrismaClient } from './test-db.helper';

describe('Seeds: idempotent, no duplicates on re-run', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seedPlans run twice produces the same row count, not double', async () => {
    await seedPlans(prisma);
    const countAfterFirst = await prisma.plan.count();

    await seedPlans(prisma);
    const countAfterSecond = await prisma.plan.count();

    expect(countAfterSecond).toBe(countAfterFirst);
    expect(countAfterFirst).toBeGreaterThan(0);
  });

  it('seedCurrencies run twice produces the same row count, not double', async () => {
    await seedCurrencies(prisma);
    const countAfterFirst = await prisma.currency.count();

    await seedCurrencies(prisma);
    const countAfterSecond = await prisma.currency.count();

    expect(countAfterSecond).toBe(countAfterFirst);
    expect(countAfterFirst).toBeGreaterThan(0);
  });
});
