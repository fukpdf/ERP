import { PGlite } from "@electric-sql/pglite";

async function run() {
  const pg = new PGlite();
  await pg.waitReady;

  try {
    console.log("Creating non-superuser role erp_app...");
    await pg.exec(`
      CREATE ROLE erp_app WITH NOBYPASSRLS;
    `);

    console.log("Creating table orgs...");
    await pg.exec(`
      CREATE TABLE orgs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        name TEXT NOT NULL
      );
    `);

    console.log("Granting permissions on orgs to erp_app...");
    await pg.exec(`
      GRANT ALL PRIVILEGES ON TABLE orgs TO erp_app;
    `);

    console.log("Enabling RLS on orgs...");
    await pg.exec("ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;");
    await pg.exec("ALTER TABLE orgs FORCE ROW LEVEL SECURITY;");

    console.log("Creating policy on orgs...");
    await pg.exec(`
      CREATE POLICY tenant_isolation_policy ON orgs
      USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
    `);

    const t1 = "d1d47e43-0c3e-4a36-ab8c-f7098d6ae9ee";
    const t2 = "c03a6381-0313-420e-b8d2-e5d3baf4103f";

    // Insert under Tenant 1 context (as superuser/owner)
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t1}', true);`);
      await tx.query(`INSERT INTO orgs (tenant_id, name) VALUES ('${t1}', 'Org 1');`);
    });

    // Insert under Tenant 2 context (as superuser/owner)
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t2}', true);`);
      await tx.query(`INSERT INTO orgs (tenant_id, name) VALUES ('${t2}', 'Org 2');`);
    });

    // NOW: Switch to erp_app non-superuser role and query!
    await pg.transaction(async (tx) => {
      await tx.query("SET ROLE erp_app;");
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t1}', true);`);
      const res = await tx.query("SELECT * FROM orgs;");
      console.log(`Querying as erp_app role for Tenant 1. Found: ${res.rows.length}`);
      console.dir(res.rows);
    });

    await pg.transaction(async (tx) => {
      await tx.query("SET ROLE erp_app;");
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t2}', true);`);
      const res = await tx.query("SELECT * FROM orgs;");
      console.log(`Querying as erp_app role for Tenant 2. Found: ${res.rows.length}`);
      console.dir(res.rows);
    });

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await pg.close();
  }
}

run();
