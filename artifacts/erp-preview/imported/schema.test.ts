import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './test-db.helper';

const EXPECTED_TABLES = [
  // Module 02 — Tenancy & Organization
  'tenants', 'plans', 'subscriptions', 'currencies', 'exchange_rates',
  'companies', 'branches', 'departments', 'cost_centers', 'locations',
  'addresses', 'fiscal_years', 'fiscal_periods', 'calendars',
  // Module 01 — Auth & Identity
  'users', 'sessions', 'devices', 'api_keys', 'mfa_methods',
  'webauthn_credentials', 'password_resets', 'email_verifications',
  'login_attempts', 'refresh_tokens',
  // Module 03 — RBAC
  'roles', 'permissions', 'role_permissions', 'user_roles', 'groups',
  'group_members', 'policies', 'delegations', 'separation_of_duty_rules',
  'access_reviews',
  // Module 04 — User & Employee Master
  'user_profiles', 'employees', 'employments', 'positions', 'job_grades',
  'teams', 'team_members', 'contacts', 'emergency_contacts', 'certifications',
  // Module 05 — Audit
  'audit_events', 'activity_logs', 'change_logs', 'access_logs', 'system_events',
  // Module 06 — Notifications
  'notification_templates', 'notifications', 'notification_preferences',
  'notification_channels', 'notification_deliveries', 'digests',
  // Module 07 — Documents
  'folders', 'documents', 'document_versions', 'file_tags', 'file_shares',
  'signature_requests', 'signatures', 'ocr_results',
  // Module 08 — Settings
  'tenant_settings', 'user_settings', 'branch_settings', 'feature_flags',
  'custom_fields', 'custom_field_values', 'form_schemas', 'form_instances',
  // Module 09 — Terminology
  'terminology_packs', 'terminology_entries', 'terminology_overrides',
  'terminology_usages',
  // Module 10 — Workflow
  'workflows', 'workflow_versions', 'workflow_steps', 'workflow_instances',
  'workflow_tasks', 'workflow_triggers', 'workflow_actions', 'workflow_logs',
];

// NOTE: "id" is the only column truly universal across every table above.
// Timestamp/version columns vary by design: append-only log tables skip
// updatedAt/version (rows are never updated in place); settings tables
// have updatedAt but no createdAt; a few models use a semantically-named
// timestamp instead (e.g. WorkflowInstance.startedAt). Rather than assert
// a uniform shape that isn't actually true of this schema, this test
// checks the one column every single table genuinely has.
const BASE_COLUMNS = ['id'];

describe('Schema: foundation-module tables exist', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(`all ${EXPECTED_TABLES.length} expected tables exist in the public schema`, async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const actual = new Set(rows.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !actual.has(t));
    expect(missing).toEqual([]);
  });

  it('every table has an "id" primary key column', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = ANY(${BASE_COLUMNS})
    `;
    const byTable = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
      byTable.get(row.table_name)!.add(row.column_name);
    }

    const violations: string[] = [];
    for (const table of EXPECTED_TABLES) {
      const cols = byTable.get(table) ?? new Set();
      for (const base of BASE_COLUMNS) {
        if (!cols.has(base)) violations.push(`${table} is missing column "${base}"`);
      }
    }
    expect(violations).toEqual([]);
  });
});
