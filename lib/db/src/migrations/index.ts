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
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON organizations;
CREATE POLICY tenant_isolation_policy ON organizations
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_entities FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON legal_entities;
CREATE POLICY tenant_isolation_policy ON legal_entities
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON roles;
CREATE POLICY tenant_isolation_policy ON roles
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON role_permissions;
CREATE POLICY tenant_isolation_policy ON role_permissions
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON user_roles;
CREATE POLICY tenant_isolation_policy ON user_roles
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
CREATE POLICY audit_logs_select_policy ON audit_logs FOR SELECT
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
CREATE POLICY audit_logs_insert_policy ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS audit_logs_update_policy ON audit_logs;
CREATE POLICY audit_logs_update_policy ON audit_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS audit_logs_delete_policy ON audit_logs;
CREATE POLICY audit_logs_delete_policy ON audit_logs FOR DELETE
  USING (false);

-- 14. Create Non-Bypass Application Role & Grant Privileges
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'erp_app') THEN
    CREATE ROLE erp_app WITH NOBYPASSRLS;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp_app;
`;

export function splitSql(sqlText: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarQuoteTag: string | null = null;
  let i = 0;

  while (i < sqlText.length) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1] || "";

    // Handle single-line comments --
    if (!inSingleQuote && !inDoubleQuote && !dollarQuoteTag && char === '-' && nextChar === '-') {
      while (i < sqlText.length && sqlText[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Handle block comments /* ... */
    if (!inSingleQuote && !inDoubleQuote && !dollarQuoteTag && char === '/' && nextChar === '*') {
      i += 2;
      while (i < sqlText.length && !(sqlText[i] === '*' && sqlText[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    // Handle dollar-quoted strings ($...$)
    if (!inSingleQuote && !inDoubleQuote) {
      if (dollarQuoteTag) {
        if (char === '$') {
          const substring = sqlText.slice(i, i + dollarQuoteTag.length);
          if (substring === dollarQuoteTag) {
            current += dollarQuoteTag;
            i += dollarQuoteTag.length;
            dollarQuoteTag = null;
            continue;
          }
        }
      } else if (char === '$') {
        const match = sqlText.slice(i).match(/^(\$[a-zA-Z_0-9]*\$)/);
        if (match) {
          dollarQuoteTag = match[1];
          current += dollarQuoteTag;
          i += dollarQuoteTag.length;
          continue;
        }
      }
    }

    // Handle single quotes '
    if (!inDoubleQuote && !dollarQuoteTag && char === "'") {
      if (sqlText[i - 1] !== "\\") {
        inSingleQuote = !inSingleQuote;
      }
    }

    // Handle double quotes "
    if (!inSingleQuote && !dollarQuoteTag && char === '"') {
      if (sqlText[i - 1] !== "\\") {
        inDoubleQuote = !inDoubleQuote;
      }
    }

    // Split on semicolon outside of any quotes or comments
    if (char === ';' && !inSingleQuote && !inDoubleQuote && !dollarQuoteTag) {
      const stmt = current.trim();
      if (stmt) {
        statements.push(stmt);
      }
      current = "";
    } else {
      current += char;
    }
    i++;
  }

  const lastStmt = current.trim();
  if (lastStmt) {
    statements.push(lastStmt);
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
  status: "applied" | "pending" | "drifted" | "failed" | "schema_invalid";
  tableCount: number;
}> {
  const db = getDb();
  const currentChecksum = computeChecksum(PHASE_3_MIGRATION_SQL);
  const EXPECTED_TABLES = [
    "schema_migrations",
    "tenants",
    "organizations",
    "legal_entities",
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "currencies",
    "locales",
    "audit_logs"
  ];

  try {
    const tableListStr = EXPECTED_TABLES.map(t => `'${t}'`).join(",");
    const tableCheck = await db.execute(`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN (${tableListStr});
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
        status: "pending",
        tableCount,
      };
    }

    if (applied.status === "failed") {
      return {
        isApplied: false,
        version: PHASE_3_MIGRATION_VERSION,
        checksum: currentChecksum,
        status: "failed",
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

    // If marked as applied but tables are missing
    if (tableCount < EXPECTED_TABLES.length) {
      return {
        isApplied: false,
        version: PHASE_3_MIGRATION_VERSION,
        checksum: currentChecksum,
        status: "schema_invalid",
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
  } catch (err) {
    return {
      isApplied: false,
      version: PHASE_3_MIGRATION_VERSION,
      checksum: currentChecksum,
      status: "pending",
      tableCount: 0,
    };
  }
}
