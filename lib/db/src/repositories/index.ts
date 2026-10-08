import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../client.js";
import {
  tenants,
  organizations,
  legalEntities,
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  currencies,
  locales,
  auditLogs,
} from "../schema/index.js";

// ============================================================================
// 1. TENANT REPOSITORY
// ============================================================================
export class TenantRepository {
  async create(data: { name: string; code: string; status?: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .insert(tenants)
      .values({
        name: data.name,
        code: data.code,
        status: data.status || "active",
      })
      .returning();
    return result;
  }

  async findById(id: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db.select().from(tenants).where(eq(tenants.id, id));
    return result || null;
  }

  async findByCode(code: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db.select().from(tenants).where(eq(tenants.code, code));
    return result || null;
  }

  async list(dbCtx?: any) {
    const db = dbCtx || getDb();
    return await db.select().from(tenants);
  }
}

// ============================================================================
// 2. ORGANIZATION REPOSITORY (Tenant-Scoped)
// ============================================================================
export class OrganizationRepository {
  async create(data: { tenantId: string; name: string; code: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .insert(organizations)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        code: data.code,
      })
      .returning();
    return result;
  }

  async listByTenant(tenantId: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    return await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, tenantId));
  }
}

// ============================================================================
// 3. USER REPOSITORY (Tenant-Scoped)
// ============================================================================
export class UserRepository {
  async create(data: { tenantId: string; email: string; fullName: string; status?: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        fullName: data.fullName,
        status: data.status || "active",
      })
      .returning();
    return result;
  }

  async listByTenant(tenantId: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async findByEmail(tenantId: string, email: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, email)));
    return result || null;
  }
}

// ============================================================================
// 4. ROLE & PERMISSION REPOSITORY (RBAC, Tenant-Scoped)
// ============================================================================
export class RolePermissionRepository {
  async createRole(data: { tenantId: string; name: string; description?: string; isSystem?: boolean }, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .insert(roles)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
        isSystem: data.isSystem || false,
      })
      .returning();
    return result;
  }

  async createPermission(data: { code: string; name: string; module: string; description?: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    const [result] = await db
      .insert(permissions)
      .values({
        code: data.code,
        name: data.name,
        module: data.module,
        description: data.description,
      })
      .returning();
    return result;
  }

  async assignPermissionToRole(data: { tenantId: string; roleId: string; permissionId: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    await db.insert(rolePermissions).values({
      tenantId: data.tenantId,
      roleId: data.roleId,
      permissionId: data.permissionId,
    });
  }

  async assignRoleToUser(data: { tenantId: string; userId: string; roleId: string }, dbCtx?: any) {
    const db = dbCtx || getDb();
    await db.insert(userRoles).values({
      tenantId: data.tenantId,
      userId: data.userId,
      roleId: data.roleId,
    });
  }

  async getUserPermissions(tenantId: string, userId: string, dbCtx?: any): Promise<string[]> {
    const db = dbCtx || getDb();
    const assignedUserRoles = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, userId)));

    if (assignedUserRoles.length === 0) return [];

    const roleIds = assignedUserRoles.map((r: any) => r.roleId);
    const assignedPermissions: string[] = [];

    for (const roleId of roleIds) {
      const rpList = await db
        .select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.tenantId, tenantId), eq(rolePermissions.roleId, roleId)));

      for (const rp of rpList) {
        const [perm] = await db.select().from(permissions).where(eq(permissions.id, rp.permissionId));
        if (perm && !assignedPermissions.includes(perm.code)) {
          assignedPermissions.push(perm.code);
        }
      }
    }

    return assignedPermissions;
  }
}

// ============================================================================
// 5. CURRENCY & LOCALE REPOSITORY
// ============================================================================
export class CurrencyRepository {
  async seedDefaults(dbCtx?: any) {
    const db = dbCtx || getDb();
    const defaultCurrencies = [
      { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, isActive: true },
      { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, isActive: true },
      { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2, isActive: true },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPlaces: 0, isActive: true },
    ];

    for (const curr of defaultCurrencies) {
      await db.insert(currencies).values(curr).onConflictDoNothing();
    }
  }

  async listActive(dbCtx?: any) {
    const db = dbCtx || getDb();
    return await db.select().from(currencies).where(eq(currencies.isActive, true));
  }
}

// ============================================================================
// 6. AUDIT LOG REPOSITORY (Cryptographic Hash Chaining)
// ============================================================================
export class AuditLogRepository {
  async createLog(
    data: {
      tenantId: string;
      actorId?: string;
      action: string;
      entityType: string;
      entityId: string;
      payload?: Record<string, any>;
    },
    dbCtx?: any
  ) {
    const db = dbCtx || getDb();

    // Fetch previous hash for tenant chain
    const tenantLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, data.tenantId));

    const prevHash = tenantLogs.length > 0 ? tenantLogs[tenantLogs.length - 1].hash : "00000000000000000000000000000000";

    const timestamp = new Date().toISOString();
    const payloadStr = JSON.stringify(data.payload || {});
    const hashData = `${prevHash}:${timestamp}:${data.tenantId}:${data.actorId || "system"}:${data.action}:${data.entityType}:${data.entityId}:${payloadStr}`;
    const hash = crypto.createHash("sha256").update(hashData).digest("hex");

    const [result] = await db
      .insert(auditLogs)
      .values({
        tenantId: data.tenantId,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        payload: data.payload || {},
        prevHash,
        hash,
      })
      .returning();

    return result;
  }

  async listByTenant(tenantId: string, dbCtx?: any) {
    const db = dbCtx || getDb();
    return await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId));
  }
}
