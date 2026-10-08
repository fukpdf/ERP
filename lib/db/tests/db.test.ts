import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
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
});
