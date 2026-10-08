import { initDatabase, executeTransaction, closeDatabase } from "../lib/db/dist/index.js";
import { sql } from "drizzle-orm";

async function run() {
  await initDatabase();
  try {
    await executeTransaction(async (tx) => {
      console.log("Setting app.current_tenant_id to 'my-test-id' inside transaction...");
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', 'my-test-id', true)`);
      
      console.log("Reading app.current_tenant_id inside the same transaction...");
      const res = await tx.execute(sql`SELECT current_setting('app.current_tenant_id', true) as val`);
      console.dir(res, { depth: null });
    });
  } catch (err) {
    console.error(err);
  } finally {
    await closeDatabase();
  }
}

run();
