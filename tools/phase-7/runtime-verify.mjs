import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import net from "node:net";
import { randomUUID } from "node:crypto";

const dbUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) throw new Error("APP_DATABASE_URL or DATABASE_URL is required");

async function redisCommand(urlString, command) {
  const url = new URL(urlString);
  const host = url.hostname, port = Number(url.port || 6379);
  const password = url.password ? decodeURIComponent(url.password) : null;
  const commands = password ? [["AUTH", password], command] : [command];
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0), index = 0;
    const encode = parts => Buffer.from("*" + parts.length + "\r\n" + parts.map(p => "$" + Buffer.byteLength(String(p)) + "\r\n" + p + "\r\n").join(""));
    const next = () => { if (index >= commands.length) return; socket.write(encode(commands[index++])); };
    socket.setTimeout(5000, () => { socket.destroy(); reject(new Error("Redis timeout")); });
    socket.on("error", reject);
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.includes(Buffer.from("\r\n"))) {
        if (index < commands.length) next(); else { socket.end(); resolve(buffer.toString()); }
      }
    });
    socket.on("connect", next);
  });
}

const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });
const report = { timestamp: new Date().toISOString(), database: {}, redis: {} };

try {
  const dbStart = performance.now();
  await prisma.$queryRaw`SELECT 1 AS ok`;
  report.database.connectMs = Number((performance.now() - dbStart).toFixed(2));

  const migrations = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`;
  report.database.migrationCount = migrations[0].count;

  const tenantTables = await prisma.$queryRaw`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns ic
        WHERE ic.table_schema='public' AND ic.table_name=c.relname AND ic.column_name='tenantId'
      )
  `;
  report.database.tenantTables = tenantTables;
  const insecure = tenantTables.filter(t => !t.rls_enabled || !t.force_rls);
  if (insecure.length) throw new Error("Tenant tables without RLS+FORCE RLS: " + insecure.map(t => t.table_name).join(", "));

  const policyRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM pg_policies WHERE schemaname='public'
  `;
  report.database.policyCount = policyRows[0].count;
  if (report.database.policyCount < tenantTables.length) {
    throw new Error("Expected at least one policy per tenant table; found " + report.database.policyCount + " for " + tenantTables.length + " tables");
  }

  const tenantA = await prisma.tenant.create({ data: { name: "phase7-a-" + randomUUID() } });
  const tenantB = await prisma.tenant.create({ data: { name: "phase7-b-" + randomUUID() } });
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantA.id}, true)`;
      await tx.organization.create({ data: { tenantId: tenantA.id, name: "Phase 7 A", code: "P7A-" + tenantA.id.slice(0, 8) } });
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantB.id}, true)`;
      await tx.organization.create({ data: { tenantId: tenantB.id, name: "Phase 7 B", code: "P7B-" + tenantB.id.slice(0, 8) } });
    });
    const visibleToA = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantA.id}, true)`;
      return tx.organization.findMany({ orderBy: { code: "asc" } });
    });
    const crossTenant = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantA.id}, true)`;
      return tx.organization.findFirst({ where: { tenantId: tenantB.id } });
    });
    report.database.tenantIsolation = { visibleRowsForA: visibleToA.length, crossTenantRowVisible: Boolean(crossTenant) };
    if (visibleToA.length !== 1 || crossTenant) throw new Error("Tenant RLS isolation probe failed");
  } finally {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantA.id}, true)`;
      await tx.organization.deleteMany({ where: { tenantId: tenantA.id } });
      await tx.$executeRaw`SELECT set_config('app.tenant_id', \${tenantB.id}, true)`;
      await tx.organization.deleteMany({ where: { tenantId: tenantB.id } });
    }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
  }

  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  const redisStart = performance.now();
  const pong = await redisCommand(process.env.REDIS_URL, ["PING"]);
  await redisCommand(process.env.REDIS_URL, ["SET", "phase7:probe", randomUUID(), "EX", "30"]);
  const got = await redisCommand(process.env.REDIS_URL, ["GET", "phase7:probe"]);
  report.redis.connectMs = Number((performance.now() - redisStart).toFixed(2));
  report.redis.ping = pong.trim();
  report.redis.readWrite = got.includes("$");
  if (!report.redis.ping.includes("+PONG") || !report.redis.readWrite) throw new Error("Redis PING/read-write probe failed");

  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
