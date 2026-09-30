import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { enqueueJob, claimJob, completeJob } from "../../packages/queue/src/postgres.js";

async function main() {
  const adminUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!adminUrl || !appUrl) throw new Error("DATABASE_URL and APP_DATABASE_URL are required");

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl }) });
  const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
  const tenantA = await admin.tenant.create({ data: { name: "phase8-a-" + crypto.randomUUID() } });
  const tenantB = await admin.tenant.create({ data: { name: "phase8-b-" + crypto.randomUUID() } });

  try {
    const jobA = await app.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`);
      const job = await enqueueJob(tx, {
        tenantId: tenantA.id,
        type: "phase8.probe",
        payload: { ok: true },
        idempotencyKey: "probe-1",
      });
      const duplicate = await enqueueJob(tx, {
        tenantId: tenantA.id,
        type: "phase8.probe",
        payload: { ok: false },
        idempotencyKey: "probe-1",
      });
      if (job.id !== duplicate.id) throw new Error("queue idempotency failed");
      const claimed = await claimJob(tx, tenantA.id, "phase8.probe");
      if (!claimed) throw new Error("queue claim failed");
      await completeJob(tx, claimed.id);
      return job.id;
    });

    const jobB = await app.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${tenantB.id}, true)`);
      const job = await enqueueJob(tx, {
        tenantId: tenantB.id,
        type: "phase8.probe",
        payload: { ok: true },
        idempotencyKey: "probe-1",
      });
      return job.id;
    });

    if (jobA === jobB) throw new Error("queue tenant idempotency isolation failed");

    const tenantAView = await app.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`);
      return tx.queueJob.findMany({ where: { id: jobB } });
    });
    if (tenantAView.length !== 0) throw new Error("cross-tenant queue visibility failed");

    const completed = await app.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`);
      return tx.queueJob.count({
        where: { tenantId: tenantA.id, status: "SUCCEEDED" },
      });
    });

    console.log(JSON.stringify({
      queueRuntime: "PASS",
      tenantA: tenantA.id,
      tenantB: tenantB.id,
      tenantAJob: jobA,
      tenantBJob: jobB,
      crossTenantVisible: tenantAView.length,
      completedJobs: completed,
    }));

    if (completed !== 1) throw new Error("queue completion gate failed");
  } finally {
    await admin.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
    await app.$disconnect();
    await admin.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
