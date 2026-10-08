import crypto from "node:crypto";
import { getDb, getEngineType } from "../client.js";

export const PHASE_3_MIGRATION_VERSION = "20261008_01_initial_schema_rls_integrity";
export const PHASE_3_MIGRATION_NAME = "Initial multi-tenant schema with RLS and composite relational integrity";

export const PHASE_3_MIGRATION_SQL = `
-- 1. Migration History Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'success'
);

-- 2. Tenants Table (Global Root Security Table)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_code ON tenants (code);

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_organizations_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT uq_organizations_id_tenant UNIQUE (id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON organizations (tenant_id);

-- 4. Legal Entities Table
CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  tax_identifier VARCHAR(64),
  country_code VARCHAR(3) NOT NULL DEFAULT 'USA',
  functional_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_legal_entities_org_tenant FOREIGN KEY (organization_id, tenant_id) REFERENCES organizations(id, tenant_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_legal_entities_tenant_org ON legal_entities (tenant_id, organization_id);

-- 5. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email VARCHAR(255) NOT NULL,
  full_name TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
  CONSTRAINT uq_users_id_tenant UNIQUE (id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);

-- 6. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_roles_tenant_name UNIQUE (tenant_id, name),
  CONSTRAINT uq_roles_id_tenant UNIQUE (id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles (tenant_id);

-- 7. Permissions Table (Global Reference)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module VARCHAR(64) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_permissions_code UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions (module);

-- 8. Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role_tenant FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions (tenant_id);

-- 9. User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user_tenant FOREIGN KEY (user_id, tenant_id) REFERENCES users(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role_tenant FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles (tenant_id);

-- 10. Currencies Table
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol VARCHAR(8) NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 11. Locales Table
CREATE TABLE IF NOT EXISTS locales (
  code VARCHAR(16) PRIMARY KEY,
  name TEXT NOT NULL,
  date_format VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
  number_format VARCHAR(32) NOT NULL DEFAULT '1,234.56',
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_id UUID,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(128) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  payload JSONB,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs (tenant_id, entity_type, entity_id);

-- 13. Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON organizations;
CREATE POLICY tenant_isolation_policy ON organizations
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON legal_entities;
CREATE POLICY tenant_isolation_policy ON legal_entities
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON roles;
CREATE POLICY tenant_isolation_policy ON roles
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON role_permissions;
CREATE POLICY tenant_isolation_policy ON role_permissions
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON user_roles;
CREATE POLICY tenant_isolation_policy ON user_roles
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
CREATE POLICY tenant_isolation_policy ON audit_logs
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
`;

export function splitSql(sqlText: string): string[] {
  let cleanSql = sqlText.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = cleanSql.split("\n");
  const filteredLines = lines.map(line => {
    const commentIndex = line.indexOf("--");
    if (commentIndex !== -1) {
      return line.slice(0, commentIndex);
    }
    return line;
  });
  cleanSql = filteredLines.join("\n");
  const rawStatements = cleanSql.split(";");
  const statements: string[] = [];
  for (const raw of rawStatements) {
    const trimmed = raw.trim();
    if (trimmed) {
      statements.push(trimmed);
    }
  }
  return statements;
}

export function computeChecksum(sqlText: string): string {
  return crypto.createHash("sha256").update(sqlText.trim()).digest("hex");
}

export async function applyMigrations(): Promise<{ success: boolean; appliedVersion: string; checksum: string; durationMs: number }> {
  const start = Date.now();
  const db = getDb();
  const checksum = computeChecksum(PHASE_3_MIGRATION_SQL);

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(32) NOT NULL DEFAULT 'success'
      );
    `);

    const existingRes = await db.execute(`SELECT id, checksum, status FROM schema_migrations WHERE id = '${PHASE_3_MIGRATION_VERSION}';`);
    const rows = (existingRes as any)?.rows || existingRes || [];
    const applied = rows[0];

    if (applied) {
      if (applied.checksum !== checksum) {
        throw new Error(`Migration checksum drift detected for migration '${PHASE_3_MIGRATION_VERSION}'. Applied checksum '${applied.checksum}' does not match current script checksum '${checksum}'.`);
      }
      return {
        success: true,
        appliedVersion: PHASE_3_MIGRATION_VERSION,
        checksum,
        durationMs: Date.now() - start,
      };
    }

    const statements = splitSql(PHASE_3_MIGRATION_SQL);
    for (const stmt of statements) {
      await db.execute(stmt);
    }

    await db.execute(`
      INSERT INTO schema_migrations (id, name, checksum, status)
      VALUES ('${PHASE_3_MIGRATION_VERSION}', '${PHASE_3_MIGRATION_NAME}', '${checksum}', 'success')
      ON CONFLICT (id) DO UPDATE SET checksum = EXCLUDED.checksum, status = 'success';
    `);

    return {
      success: true,
      appliedVersion: PHASE_3_MIGRATION_VERSION,
      checksum,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    throw new Error(`Migration execution failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getMigrationStatus(): Promise<{
  isApplied: boolean;
  version: string;
  checksum: string;
  status: "applied" | "pending" | "drifted" | "failed";
  tableCount: number;
}> {
  const db = getDb();
  const currentChecksum = computeChecksum(PHASE_3_MIGRATION_SQL);

  try {
    const tableCheck = await db.execute(`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('tenants', 'organizations', 'users', 'roles', 'currencies', 'schema_migrations');
    `);
    const rows = (tableCheck as any)?.rows || tableCheck || [];
    const tableCount = Number(rows[0]?.count || 0);

    const migCheck = await db.execute(`SELECT id, checksum, status FROM schema_migrations WHERE id = '${PHASE_3_MIGRATION_VERSION}';`);
    const migRows = (migCheck as any)?.rows || migCheck || [];
    const applied = migRows[0];

    if (!applied) {
      return {
        isApplied: false,
        version: PHASE_3_MIGRATION_VERSION,
        checksum: currentChecksum,
        status: tableCount > 0 ? "pending" : "pending",
        tableCount,
      };
    }

    if (applied.checksum !== currentChecksum) {
      return {
        isApplied: false,
        version: PHASE_3_MIGRATION_VERSION,
        checksum: currentChecksum,
        status: "drifted",
        tableCount,
      };
    }

    return {
      isApplied: true,
      version: PHASE_3_MIGRATION_VERSION,
      checksum: currentChecksum,
      status: "applied",
      tableCount,
    };
  } catch {
    return {
      isApplied: false,
      version: PHASE_3_MIGRATION_VERSION,
      checksum: currentChecksum,
      status: "pending",
      tableCount: 0,
    };
  }
}
