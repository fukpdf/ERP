import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// 1. TENANTS TABLE (Core Multi-Tenant Root Entity)
// ============================================================================
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("idx_tenants_code").on(table.code),
  })
);

// ============================================================================
// 2. ORGANIZATIONS TABLE (Tenant Business Divisions / Operating Units)
// ============================================================================
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_organizations_tenant").on(table.tenantId),
    tenantCodeUq: uniqueIndex("uq_organizations_tenant_code").on(table.tenantId, table.code),
  })
);

// ============================================================================
// 3. LEGAL ENTITIES TABLE (Filing Entities, Tax Registrations, Books of Accounts)
// ============================================================================
export const legalEntities = pgTable(
  "legal_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    taxIdentifier: varchar("tax_identifier", { length: 64 }),
    countryCode: varchar("country_code", { length: 3 }).notNull().default("USA"),
    functionalCurrency: varchar("functional_currency", { length: 3 }).notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantOrgIdx: index("idx_legal_entities_tenant_org").on(table.tenantId, table.organizationId),
  })
);

// ============================================================================
// 4. USERS TABLE (Identity & Tenant Memberships)
// ============================================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: text("full_name").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantEmailUq: uniqueIndex("uq_users_tenant_email").on(table.tenantId, table.email),
    tenantIdx: index("idx_users_tenant").on(table.tenantId),
  })
);

// ============================================================================
// 5. ROLES TABLE (Tenant Role-Based Access Control)
// ============================================================================
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 64 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantNameUq: uniqueIndex("uq_roles_tenant_name").on(table.tenantId, table.name),
    tenantIdx: index("idx_roles_tenant").on(table.tenantId),
  })
);

// ============================================================================
// 6. PERMISSIONS TABLE (Atomic Capability Permissions)
// ============================================================================
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 128 }).notNull().unique(),
    name: text("name").notNull(),
    module: varchar("module", { length: 64 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    moduleIdx: index("idx_permissions_module").on(table.module),
    codeUq: uniqueIndex("uq_permissions_code").on(table.code),
  })
);

// ============================================================================
// 7. ROLE_PERMISSIONS TABLE (Role Permission Mapping)
// ============================================================================
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    tenantIdx: index("idx_role_permissions_tenant").on(table.tenantId),
  })
);

// ============================================================================
// 8. USER_ROLES TABLE (User Role Assignment)
// ============================================================================
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
    tenantIdx: index("idx_user_roles_tenant").on(table.tenantId),
  })
);

// ============================================================================
// 9. CURRENCIES TABLE (ISO 4217 Currency Reference Master)
// ============================================================================
export const currencies = pgTable("currencies", {
  code: varchar("code", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  decimalPlaces: integer("decimal_places").default(2).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ============================================================================
// 10. LOCALES TABLE (I18n Localization Preference Master)
// ============================================================================
export const locales = pgTable("locales", {
  code: varchar("code", { length: 16 }).primaryKey(),
  name: text("name").notNull(),
  dateFormat: varchar("date_format", { length: 32 }).default("YYYY-MM-DD").notNull(),
  numberFormat: varchar("number_format", { length: 32 }).default("1,234.56").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ============================================================================
// 11. AUDIT LOGS TABLE (Cryptographic Tamper-Evident Ledger)
// ============================================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 128 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }).notNull(),
    payload: jsonb("payload"),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantEntityIdx: index("idx_audit_logs_tenant_entity").on(table.tenantId, table.entityType, table.entityId),
  })
);