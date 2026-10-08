import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const tenantStorage = new AsyncLocalStorage<string>();

export function getActiveTenantId(): string | undefined {
  return tenantStorage.getStore();
}

export interface DatabaseConfig {
  connectionString?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMs?: number;
}

export type DatabaseEngine = "pg" | "pglite";

let activePool: pg.Pool | undefined;
let activePglite: PGlite | undefined;
let activeDb: any | undefined;
let activeEngine: DatabaseEngine = "pglite";

export async function initDatabase(config?: DatabaseConfig): Promise<{
  db: any;
  engine: DatabaseEngine;
}> {
  const connectionString = config?.connectionString || process.env.DATABASE_URL;

  if (connectionString) {
    activePool = new Pool({
      connectionString,
      ssl: config?.ssl ? { rejectUnauthorized: false } : undefined,
      max: config?.maxConnections || 10,
      idleTimeoutMillis: config?.idleTimeoutMs || 30000,
    });
    activeDb = drizzlePg(activePool, { schema });
    activeEngine = "pg";
  } else {
    // In-memory or standalone real WASM PostgreSQL 16 instance (PGlite)
    activePglite = new PGlite();
    await activePglite.waitReady;
    activeDb = drizzlePglite(activePglite, { schema });
    activeEngine = "pglite";
  }

  return { db: activeDb, engine: activeEngine };
}

export function getDb(): any {
  if (!activeDb) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return activeDb;
}

export function getEngineType(): DatabaseEngine {
  return activeEngine;
}

export async function getDatabaseHealth(): Promise<{
  status: "ok" | "down";
  engine: DatabaseEngine;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    if (!activeDb) {
      return { status: "down", engine: activeEngine, latencyMs: 0, error: "Database not initialized" };
    }

    if (activeEngine === "pg" && activePool) {
      await activePool.query("SELECT 1;");
    } else if (activeEngine === "pglite" && activePglite) {
      await activePglite.query("SELECT 1;");
    }

    return {
      status: "ok",
      engine: activeEngine,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "down",
      engine: activeEngine,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (activePool) {
    await activePool.end();
    activePool = undefined;
  }
  if (activePglite) {
    await activePglite.close();
    activePglite = undefined;
  }
  activeDb = undefined;
}

const transactionStorage = new AsyncLocalStorage<any>();

export function getActiveTransaction(): any | undefined {
  return transactionStorage.getStore();
}

export class UnitOfWork {
  async run<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const activeTx = getActiveTransaction();
    if (activeTx) {
      // Re-use active transaction (nested transaction participation)
      return await callback(activeTx);
    }

    return await executeTransaction(async (tx) => {
      // Apply active tenant context if available
      const tenantId = getActiveTenantId();
      if (tenantId) {
        await tx.execute(sql`SET LOCAL ROLE erp_app`);
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
      }

      return await transactionStorage.run(tx, async () => {
        return await callback(tx);
      });
    });
  }
}

export async function executeTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const activeTx = getActiveTransaction();
  if (activeTx) {
    return await callback(activeTx);
  }

  const db = getDb();
  if (activeEngine === "pglite" && activePglite) {
    return await activePglite.transaction(async (pgTx: any) => {
      const txDb = drizzlePglite(pgTx, { schema });
      return await transactionStorage.run(txDb, async () => {
        return await callback(txDb);
      });
    });
  }
  return await db.transaction(async (tx: any) => {
    return await transactionStorage.run(tx, async () => {
      return await callback(tx);
    });
  });
}

export async function runInTenantContext<T>(
  tenantId: string,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  if (!tenantId || typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("Invalid tenant context: tenantId is required");
  }

  return await tenantStorage.run(tenantId, async () => {
    const uow = new UnitOfWork();
    return await uow.run(async (tx) => {
      return await callback(tx);
    });
  });
}
