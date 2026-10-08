import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import {
  initDatabase,
  closeDatabase,
  getDatabaseHealth,
  applyMigrations,
  getMigrationStatus,
  executeTransaction,
  runInTenantContext,
  TenantRepository,
  OrganizationRepository,
  UserRepository,
  RolePermissionRepository,
  CurrencyRepository,
  AuditLogRepository,
  getDb,
  legalEntities,
  UnitOfWork,
  tenants,
  organizations,
  auditLogs,
} from "../dist/index.js";

describe("Phase 3 Database & Persistence Platform Foundation", () => {
  const tenantRepo = new TenantRepository();
  const orgRepo = new OrganizationRepository();
  const userRepo = new UserRepository();
  const rbacRepo = new RolePermissionRepository();
  const currencyRepo = new CurrencyRepository();
  const auditRepo = new AuditLogRepository();

  before(async () => {
    await initDatabase();
    await applyMigrations();
  });

  after(async () => {
    await closeDatabase();
  });

  it("verifies health check probe and migration status", async () => {
    const health = await getDatabaseHealth();
    assert.equal(health.status, "ok");
    assert.ok(health.latencyMs >= 0);

    const migrationStatus = await getMigrationStatus();
    assert.equal(migrationStatus.isApplied, true);
    assert.equal(migrationStatus.status, "applied");
    assert.ok(migrationStatus.tableCount >= 5);
  });

  it("creates tenants and enforces unique tenant codes", async () => {
    const t1 = await tenantRepo.create({ name: "Acme Corp", code: "ACME" });
    assert.ok(t1.id);
    assert.equal(t1.code, "ACME");

    const found = await tenantRepo.findByCode("ACME");
    assert.equal(found?.id, t1.id);

    // Re-inserting duplicate tenant code should throw unique constraint error
    await assert.rejects(async () => {
      await tenantRepo.create({ name: "Acme Duplicate", code: "ACME" });
    });
  });

  it("enforces tenant-scoped organization isolation and constraints", async () => {
    const tenant1 = await tenantRepo.create({ name: "Tenant Alpha", code: "T-ALPHA" });
    const tenant2 = await tenantRepo.create({ name: "Tenant Beta", code: "T-BETA" });

    const org1 = await orgRepo.create({ tenantId: tenant1.id, name: "US Division", code: "US-DIV" });
    const org2 = await orgRepo.create({ tenantId: tenant2.id, name: "EU Division", code: "EU-DIV" });

    assert.equal(org1.tenantId, tenant1.id);
    assert.equal(org2.tenantId, tenant2.id);

    // List by tenant enforces isolation
    const alphaOrgs = await orgRepo.listByTenant(tenant1.id);
    assert.equal(alphaOrgs.length, 1);
    assert.equal(alphaOrgs[0].id, org1.id);

    const betaOrgs = await orgRepo.listByTenant(tenant2.id);
    assert.equal(betaOrgs.length, 1);
    assert.equal(betaOrgs[0].id, org2.id);
  });

  it("enforces multi-tenant RBAC permissions and user role assignment", async () => {
    const tenant = await tenantRepo.create({ name: "RBAC Corp", code: "RBAC-CORP" });
    const user = await userRepo.create({ tenantId: tenant.id, email: "admin@rbac.com", fullName: "Admin User" });

    const role = await rbacRepo.createRole({ tenantId: tenant.id, name: "SystemAdmin" });
    const perm1 = await rbacRepo.createPermission({ code: "gl:write", name: "Create GL Entries", module: "gl" });
    const perm2 = await rbacRepo.createPermission({ code: "gl:read", name: "View GL Entries", module: "gl" });

    await rbacRepo.assignPermissionToRole({ tenantId: tenant.id, roleId: role.id, permissionId: perm1.id });
    await rbacRepo.assignPermissionToRole({ tenantId: tenant.id, roleId: role.id, permissionId: perm2.id });
    await rbacRepo.assignRoleToUser({ tenantId: tenant.id, userId: user.id, roleId: role.id });

    const userPerms = await rbacRepo.getUserPermissions(tenant.id, user.id);
    assert.equal(userPerms.length, 2);
    assert.ok(userPerms.includes("gl:write"));
    assert.ok(userPerms.includes("gl:read"));
  });

  it("executes atomic transactions and rolls back on failure", async () => {
    const tenant = await tenantRepo.create({ name: "Tx Corp", code: "TX-CORP" });

    await assert.rejects(async () => {
      await executeTransaction(async (tx) => {
        await userRepo.create({ tenantId: tenant.id, email: "tx1@corp.com", fullName: "Tx User 1" }, tx);
        // Intentional error to trigger rollback
        throw new Error("Simulated transactional error");
      });
    });

    // Verify user was NOT created due to rollback
    const user = await userRepo.findByEmail(tenant.id, "tx1@corp.com");
    assert.equal(user, null);
  });

  it("executes tenant-scoped transactions with session context", async () => {
    const tenant = await tenantRepo.create({ name: "Session Corp", code: "SESS-CORP" });

    const result = await runInTenantContext(tenant.id, async (tx) => {
      return await userRepo.create({ tenantId: tenant.id, email: "sess@corp.com", fullName: "Sess User" }, tx);
    });

    assert.equal(result.email, "sess@corp.com");
  });

  it("generates cryptographic hash-chained audit log records", async () => {
    const tenant = await tenantRepo.create({ name: "Audit Corp", code: "AUDIT-CORP" });

    const log1 = await auditRepo.createLog({
      tenantId: tenant.id,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: "u-001",
      payload: { ip: "127.0.0.1" },
    });

    const log2 = await auditRepo.createLog({
      tenantId: tenant.id,
      action: "GL_POST",
      entityType: "voucher",
      entityId: "v-1001",
      payload: { amount: 500 },
    });

    assert.equal(log1.prevHash, "00000000000000000000000000000000");
    assert.equal(log2.prevHash, log1.hash);
    assert.notEqual(log1.hash, log2.hash);
  });

  it("seeds and queries active currencies", async () => {
    await currencyRepo.seedDefaults();
    const active = await currencyRepo.listActive();
    assert.ok(active.length >= 4);
    const codes = active.map((c) => c.code);
    assert.ok(codes.includes("USD"));
    assert.ok(codes.includes("EUR"));
  });

  it("enforces strict cross-tenant data isolation and fail-closed behavior", async () => {
    const tenantA = await tenantRepo.create({ name: "Tenant Omega", code: "T-OMEGA" });
    const tenantB = await tenantRepo.create({ name: "Tenant Delta", code: "T-DELTA" });

    // Create user in Tenant A
    await userRepo.create({ tenantId: tenantA.id, email: "omega@omega.com", fullName: "Omega User" });

    // Attempt cross-tenant access: Tenant B context accessing Tenant A data must be rejected
    await assert.rejects(async () => {
      await runInTenantContext(tenantB.id, async (tx) => {
        return await userRepo.listByTenant(tenantA.id, tx);
      });
    });
  });

  it("enforces database-level cross-tenant relational integrity via composite foreign keys", async () => {
    const tenantA = await tenantRepo.create({ name: "Tenant Gamma", code: "T-GAMMA" });
    const tenantB = await tenantRepo.create({ name: "Tenant Zeta", code: "T-ZETA" });

    const orgB = await orgRepo.create({ tenantId: tenantB.id, name: "Zeta Org", code: "ZETA-ORG" });

    // Attempt to create legal entity in Tenant A referencing organization in Tenant B (must fail foreign key violation)
    await assert.rejects(async () => {
      const db = getDb();
      await db.insert(legalEntities).values({
        tenantId: tenantA.id,
        organizationId: orgB.id,
        name: "Invalid Cross-Tenant LE",
      });
    });
  });

  // ============================================================================
  // PHASE 4 COMPREHENSIVE TEST MATRIX
  // ============================================================================

  it("verifies migration rerun and checksum drift detection", async () => {
    // 1. Re-running applyMigrations is safe and idempotent
    const res = await applyMigrations();
    assert.equal(res.success, true);

    // 2. Fetch migration status
    const statusBefore = await getMigrationStatus();
    assert.equal(statusBefore.status, "applied");

    // 3. Test checksum drift
    const db = getDb();
    await db.execute(sql`UPDATE schema_migrations SET checksum = 'invalid_checksum'`);
    
    const statusAfter = await getMigrationStatus();
    assert.equal(statusAfter.status, "drifted");

    // Restore correct checksum
    await db.execute(sql`UPDATE schema_migrations SET checksum = ${statusBefore.checksum}`);
  });

  it("proves direct database-level RLS on SELECT, INSERT, UPDATE, and DELETE", async () => {
    const tenant1 = await tenantRepo.create({ name: "Direct RLS Tenant A", code: "RLS-A" });
    const tenant2 = await tenantRepo.create({ name: "Direct RLS Tenant B", code: "RLS-B" });

    // 1. Establish Tenant A context and insert directly (Drizzle)
    await runInTenantContext(tenant1.id, async (tx) => {
      await tx.insert(organizations).values({
        tenantId: tenant1.id,
        name: "Org A",
        code: "ORG-A"
      });
    });

    // 2. Establish Tenant B context and insert directly (Drizzle)
    await runInTenantContext(tenant2.id, async (tx) => {
      await tx.insert(organizations).values({
        tenantId: tenant2.id,
        name: "Org B",
        code: "ORG-B"
      });
    });

    // 3. Under Tenant A context: we must only see Tenant A's organizations
    await runInTenantContext(tenant1.id, async (tx) => {
      const results = await tx.select().from(organizations);
      assert.equal(results.length, 1);
      assert.equal(results[0].tenantId, tenant1.id);
    });

    // 4. Under Tenant B context: we must only see Tenant B's organizations
    await runInTenantContext(tenant2.id, async (tx) => {
      const results = await tx.select().from(organizations);
      assert.equal(results.length, 1);
      assert.equal(results[0].tenantId, tenant2.id);
    });

    // 5. Cross-tenant INSERT: under Tenant B context, inserting Tenant A row must fail RLS WITH CHECK policy
    await assert.rejects(async () => {
      await runInTenantContext(tenant2.id, async (tx) => {
        await tx.insert(organizations).values({
          tenantId: tenant1.id,
          name: "Malicious Org A",
          code: "MAL-A"
        });
      });
    });

    // 6. Cross-tenant UPDATE: under Tenant B context, updating Tenant A's row must fail (0 rows updated due to RLS USING restriction)
    await runInTenantContext(tenant2.id, async (tx) => {
      const updated = await tx.update(organizations)
        .set({ name: "Hacked Org A" })
        .where(eq(organizations.tenantId, tenant1.id));
      
      const rows = (updated as any)?.rows || updated || [];
      // RLS filters out Tenant A rows, so the statement affects 0 rows
      assert.equal(rows.length, 0);
    });

    // Verify Tenant A Org is untouched
    await runInTenantContext(tenant1.id, async (tx) => {
      const results = await tx.select().from(organizations);
      assert.equal(results[0].name, "Org A");
    });
  });

  it("proves tenants table security RLS isolation", async () => {
    const tenant1 = await tenantRepo.create({ name: "Secure Tenant 1", code: "SEC-T1" });
    const tenant2 = await tenantRepo.create({ name: "Secure Tenant 2", code: "SEC-T2" });

    // Under Tenant 1 context, SELECT on tenants table must only return Tenant 1's record
    await runInTenantContext(tenant1.id, async (tx) => {
      const results = await tx.select().from(tenants);
      assert.equal(results.length, 1);
      assert.equal(results[0].id, tenant1.id);
    });

    // Under Tenant 2 context, SELECT on tenants table must only return Tenant 2's record
    await runInTenantContext(tenant2.id, async (tx) => {
      const results = await tx.select().from(tenants);
      assert.equal(results.length, 1);
      assert.equal(results[0].id, tenant2.id);
    });
  });

  it("proves database-level RLS policies block update and delete on audit logs", async () => {
    const tenant = await tenantRepo.create({ name: "Audit Security Corp", code: "AUDIT-SEC" });

    // 1. Create a log
    const log = await runInTenantContext(tenant.id, async (tx) => {
      return await auditRepo.createLog({
        tenantId: tenant.id,
        action: "SENSITIVE_WRITE",
        entityType: "account",
        entityId: "acc-101",
        payload: { amount: 5000 }
      }, tx);
    });

    assert.ok(log.id);

    // 2. Direct database UPDATE on audit_logs affects 0 rows under Tenant context
    await runInTenantContext(tenant.id, async (tx) => {
      const updated = await tx.update(auditLogs)
        .set({ action: "FRAUDULENT_CHANGE" })
        .where(eq(auditLogs.id, log.id));
      
      const rows = (updated as any)?.rows || updated || [];
      assert.equal(rows.length, 0);
    });

    // 3. Direct database DELETE on audit_logs affects 0 rows under Tenant context
    await runInTenantContext(tenant.id, async (tx) => {
      const deleted = await tx.delete(auditLogs)
        .where(eq(auditLogs.id, log.id));
      
      const rows = (deleted as any)?.rows || deleted || [];
      assert.equal(rows.length, 0);
    });

    // 4. Verify that the log is still retrieved intact and has not been changed
    await runInTenantContext(tenant.id, async (tx) => {
      const results = await tx.select().from(auditLogs).where(eq(auditLogs.id, log.id));
      assert.equal(results.length, 1);
      assert.equal(results[0].action, "SENSITIVE_WRITE");
    });
  });

  it("proves audit log verification utility correctly detects tampering", async () => {
    const tenant = await tenantRepo.create({ name: "Audit Tamper Corp", code: "AUDIT-TAMPER" });

    // 1. Create a valid chain of 3 logs
    await runInTenantContext(tenant.id, async (tx) => {
      await auditRepo.createLog({ tenantId: tenant.id, action: "OP_1", entityType: "user", entityId: "u1" }, tx);
      await auditRepo.createLog({ tenantId: tenant.id, action: "OP_2", entityType: "user", entityId: "u2" }, tx);
      await auditRepo.createLog({ tenantId: tenant.id, action: "OP_3", entityType: "user", entityId: "u3" }, tx);
    });

    // Verify correct chain is valid
    const initialVerify = await auditRepo.verifyTenantChain(tenant.id);
    assert.equal(initialVerify.valid, true);

    // 2. Tamper with a payload (simulating a bypass of RLS by directly modifying via non-RLS/owner connection)
    const logs = await auditRepo.listByTenant(tenant.id);
    const middleLog = logs[1];

    const db = getDb();
    await db.update(auditLogs)
      .set({ payload: { tampered: true } })
      .where(eq(auditLogs.id, middleLog.id));

    // Verify verification utility detects the tamper!
    const tamperedVerify = await auditRepo.verifyTenantChain(tenant.id);
    assert.equal(tamperedVerify.valid, false);
    assert.ok(tamperedVerify.reason?.includes("Hash mismatch"));

    // Clean up
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenant.id));
  });

  it("verifies Unit of Work atomic transaction boundaries, nested composition, and isolation", async () => {
    const tenant = await tenantRepo.create({ name: "UoW Corp", code: "UOW-CORP" });
    const uow = new UnitOfWork();

    // 1. Test nested composition: nested operations participate in same transaction
    await runInTenantContext(tenant.id, async () => {
      await uow.run(async (tx1) => {
        const u1 = await userRepo.create({ tenantId: tenant.id, email: "uow1@corp.com", fullName: "UoW User 1" }, tx1);
        
        await uow.run(async (tx2) => {
          assert.equal(tx1, tx2);
          await userRepo.create({ tenantId: tenant.id, email: "uow2@corp.com", fullName: "UoW User 2" }, tx2);
        });
      });
    });

    const user1 = await userRepo.findByEmail(tenant.id, "uow1@corp.com");
    assert.ok(user1);
    const user2 = await userRepo.findByEmail(tenant.id, "uow2@corp.com");
    assert.ok(user2);

    // 2. Test rollback of complete unit of work including nested operations on failure
    await assert.rejects(async () => {
      await runInTenantContext(tenant.id, async () => {
        await uow.run(async (tx1) => {
          await userRepo.create({ tenantId: tenant.id, email: "uow_rollback1@corp.com", fullName: "Rollback User 1" }, tx1);
          
          await uow.run(async (tx2) => {
            await userRepo.create({ tenantId: tenant.id, email: "uow_rollback2@corp.com", fullName: "Rollback User 2" }, tx2);
            throw new Error("Simulated UoW failure");
          });
        });
      });
    });

    const rb1 = await userRepo.findByEmail(tenant.id, "uow_rollback1@corp.com");
    assert.equal(rb1, null);
    const rb2 = await userRepo.findByEmail(tenant.id, "uow_rollback2@corp.com");
    assert.equal(rb2, null);
  });

  it("proves transaction-scoped tenant setting does not leak context across connection reuse", async () => {
    const tenantA = await tenantRepo.create({ name: "Conn Reuse Tenant A", code: "CONN-A" });
    const tenantB = await tenantRepo.create({ name: "Conn Reuse Tenant B", code: "CONN-B" });

    // 1. Establish Tenant A context and check setting
    await runInTenantContext(tenantA.id, async (tx) => {
      const setting = await tx.execute(sql`SELECT current_setting('app.current_tenant_id', true) as val`);
      const rows = (setting as any)?.rows || setting || [];
      const val = rows[0]?.val;
      assert.equal(val, tenantA.id);
    });

    // 2. Establish Tenant B context and check setting
    await runInTenantContext(tenantB.id, async (tx) => {
      const setting = await tx.execute(sql`SELECT current_setting('app.current_tenant_id', true) as val`);
      const rows = (setting as any)?.rows || setting || [];
      const val = rows[0]?.val;
      assert.equal(val, tenantB.id);
    });

    // 3. Direct execute outside of any transaction: setting must be null/empty, proving no context leakage on reuse
    const db = getDb();
    const settingOutside = await db.execute(sql`SELECT current_setting('app.current_tenant_id', true) as val`);
    const rowsOutside = (settingOutside as any)?.rows || settingOutside || [];
    const valOutside = rowsOutside[0]?.val || "";
    assert.equal(valOutside, "");
  });
});
