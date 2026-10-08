import { PGlite } from "@electric-sql/pglite";

async function run() {
  const pg = new PGlite();
  await pg.waitReady;

  try {
    console.log("Creating table tenants...");
    await pg.exec(`
      CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL
      );
    `);

    console.log("Creating table orgs...");
    await pg.exec(`
      CREATE TABLE orgs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        name TEXT NOT NULL
      );
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

    console.log("Inserting test tenants...");
    const t1 = (await pg.query("INSERT INTO tenants (name) VALUES ('Tenant 1') RETURNING id;")).rows[0].id;
    const t2 = (await pg.query("INSERT INTO tenants (name) VALUES ('Tenant 2') RETURNING id;")).rows[0].id;

    console.log(`Tenant 1: ${t1}`);
    console.log(`Tenant 2: ${t2}`);

    // Insert under Tenant 1 context
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t1}', true);`);
      await tx.query(`INSERT INTO orgs (tenant_id, name) VALUES ('${t1}', 'Org 1');`);
    });

    // Insert under Tenant 2 context
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t2}', true);`);
      await tx.query(`INSERT INTO orgs (tenant_id, name) VALUES ('${t2}', 'Org 2');`);
    });

    // Select under Tenant 1 context
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t1}', true);`);
      const res = await tx.query("SELECT * FROM orgs;");
      console.log(`Querying orgs under Tenant 1 context. Found: ${res.rows.length}`);
      console.dir(res.rows);
    });

    // Select under Tenant 2 context
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant_id', '${t2}', true);`);
      const res = await tx.query("SELECT * FROM orgs;");
      console.log(`Querying orgs under Tenant 2 context. Found: ${res.rows.length}`);
      console.dir(res.rows);
    });

    // Select without tenant context
    try {
      const resNoContext = await pg.query("SELECT * FROM orgs;");
      console.log(`Querying orgs without tenant context. Found: ${resNoContext.rows.length}`);
      console.dir(resNoContext.rows);
    } catch (e) {
      console.log("SELECT without context threw error (fail closed):", e.message);
    }

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await pg.close();
  }
}

run();
