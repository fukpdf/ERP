import { describe, it, expect, beforeEach } from '@jest/globals';
import { FieldPermissionService } from '../../src/modules/rbac/services/field-permission.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';

describe('FieldPermissionService', () => {
  let repo: InMemoryRbacRepository;
  let service: FieldPermissionService;

  beforeEach(async () => {
    repo = new InMemoryRbacRepository();
    service = new FieldPermissionService(repo);
    await service.upsertRule('t1', { resource: 'employee', fieldName: 'salary', visibleToRoleKeys: ['system.owner', 'hr.manager'] });
    await service.upsertRule('t1', { resource: 'employee', fieldName: 'ssn_last4', visibleToRoleKeys: ['hr.manager'] });
  });

  it('hides a restricted field entirely (key absent, not null) from a role not on the allowlist', async () => {
    const record = { id: '1', name: 'Alex', salary: 120000, ssn_last4: '1234' };
    const filtered = await service.filterRecord('t1', 'employee', record, ['erp.sales.manager']);
    expect('salary' in filtered).toBe(false);
    expect('ssn_last4' in filtered).toBe(false);
    expect(filtered.name).toBe('Alex'); // unrestricted field stays
  });

  it('shows a restricted field to a role on its allowlist', async () => {
    const record = { id: '1', name: 'Alex', salary: 120000, ssn_last4: '1234' };
    const filtered = await service.filterRecord('t1', 'employee', record, ['hr.manager']);
    expect(filtered.salary).toBe(120000);
    expect(filtered.ssn_last4).toBe('1234');
  });

  it('applies per-field rules independently — owner sees salary but not ssn_last4', async () => {
    const record = { id: '1', name: 'Alex', salary: 120000, ssn_last4: '1234' };
    const filtered = await service.filterRecord('t1', 'employee', record, ['system.owner']);
    expect(filtered.salary).toBe(120000);
    expect('ssn_last4' in filtered).toBe(false);
  });

  it('a field with no rule at all is visible to everyone', async () => {
    const record = { id: '1', name: 'Alex', department: 'sales' };
    const filtered = await service.filterRecord('t1', 'employee', record, ['nobody-role']);
    expect(filtered.department).toBe('sales');
  });

  it('a resource with no rules at all returns the record unchanged', async () => {
    const record = { id: '1', title: 'Q1 Plan' };
    const filtered = await service.filterRecord('t1', 'project', record, ['nobody-role']);
    expect(filtered).toEqual(record);
  });

  it('filterRecords applies the same filtering across a list', async () => {
    const records = [
      { id: '1', name: 'Alex', salary: 100 },
      { id: '2', name: 'Sam', salary: 200 },
    ];
    const filtered = await service.filterRecords('t1', 'employee', records, ['erp.sales.manager']);
    expect(filtered.every((r) => !('salary' in r))).toBe(true);
    expect(filtered.map((r) => r.name)).toEqual(['Alex', 'Sam']);
  });

  it('does not mutate the original record', async () => {
    const record = { id: '1', name: 'Alex', salary: 100 };
    await service.filterRecord('t1', 'employee', record, ['erp.sales.manager']);
    expect(record.salary).toBe(100); // original untouched
  });
});
