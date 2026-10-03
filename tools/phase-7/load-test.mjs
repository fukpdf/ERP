import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dbUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) throw new Error("APP_DATABASE_URL or DATABASE_URL is required");

const concurrency = Number(process.env.PHASE7_LOAD_CONCURRENCY ?? 16);
const requests = Number(process.env.PHASE7_LOAD_REQUESTS ?? 256);
const maxP95 = Number(process.env.PHASE7_LOAD_MAX_P95_MS ?? 250);

if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Invalid concurrency");
if (!Number.isInteger(requests) || requests < concurrency) throw new Error("Invalid requests");
if (!Number.isFinite(maxP95) || maxP95 <= 0) throw new Error("Invalid max p95");

const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });
const durations = [];
let next = 0;

const worker = async () => {
  while (true) {
    const i = next++;
    if (i >= requests) return;
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1 AS ok`;
    durations.push(performance.now() - start);
  }
};

try {
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  durations.sort((a, b) => a - b);

  const p95 = durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)];
  const elapsed = performance.now() - started;
  const report = {
    requests,
    concurrency,
    elapsedMs: Number(elapsed.toFixed(2)),
    requestsPerSecond: Number((requests / (elapsed / 1000)).toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxP95Ms: maxP95
  };

  console.log(JSON.stringify(report, null, 2));
  if (p95 > maxP95) {
    throw new Error("Load gate failed: p95 " + p95.toFixed(2) + "ms > " + maxP95 + "ms");
  }
} finally {
  await prisma.$disconnect();
}
