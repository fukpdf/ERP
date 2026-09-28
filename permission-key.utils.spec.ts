import { describe, it, expect } from '@jest/globals';
import {
  parsePermissionKey,
  permissionNamespace,
  buildPermissionKey,
  allInNamespace,
} from '../../src/modules/rbac/services/permission-key.utils';
import { InvalidPermissionKeyError } from '../../src/modules/rbac/errors/rbac.errors';

describe('parsePermissionKey', () => {
  it('parses the 4-segment ERP form from the prompt\'s own example', () => {
    expect(parsePermissionKey('erp.finance.journal.create')).toEqual({
      namespace: 'erp', module: 'finance', resource: 'journal', action: 'create',
    });
  });

  it('parses the 3-segment control-plane form from the prompt\'s own example', () => {
    expect(parsePermissionKey('control.tenant.suspend')).toEqual({
      namespace: 'control', module: 'tenant', resource: 'tenant', action: 'suspend',
    });
  });

  it('parses a 5-segment nested-resource key', () => {
    expect(parsePermissionKey('erp.hr.employee.address.update')).toEqual({
      namespace: 'erp', module: 'hr', resource: 'employee.address', action: 'update',
    });
  });

  it('rejects an unknown namespace', () => {
    expect(() => parsePermissionKey('billing.plan.change')).toThrow(InvalidPermissionKeyError);
  });

  it('rejects fewer than 3 segments', () => {
    expect(() => parsePermissionKey('erp.create')).toThrow(InvalidPermissionKeyError);
  });

  it('rejects uppercase or invalid characters', () => {
    expect(() => parsePermissionKey('erp.Finance.journal.create')).toThrow(InvalidPermissionKeyError);
    expect(() => parsePermissionKey('erp.finance.journal.create!')).toThrow(InvalidPermissionKeyError);
  });
});

describe('permissionNamespace', () => {
  it('extracts the namespace from either key shape', () => {
    expect(permissionNamespace('erp.finance.journal.create')).toBe('erp');
    expect(permissionNamespace('control.tenant.suspend')).toBe('control');
  });
});

describe('buildPermissionKey', () => {
  it('builds the 4-segment form when resource differs from module', () => {
    expect(buildPermissionKey('erp', 'finance', 'journal', 'create')).toBe('erp.finance.journal.create');
  });

  it('collapses to the 3-segment control-plane form when resource equals module', () => {
    expect(buildPermissionKey('control', 'tenant', 'tenant', 'suspend')).toBe('control.tenant.suspend');
  });

  it('round-trips through parsePermissionKey', () => {
    const key = buildPermissionKey('erp', 'sales', 'order', 'void');
    expect(parsePermissionKey(key)).toEqual({ namespace: 'erp', module: 'sales', resource: 'order', action: 'void' });
  });
});

describe('allInNamespace', () => {
  it('is true when every key is in the namespace', () => {
    expect(allInNamespace(['erp.a.b.c', 'erp.d.e.f'], 'erp')).toBe(true);
  });

  it('is false as soon as one key is in a different namespace', () => {
    expect(allInNamespace(['erp.a.b.c', 'control.x.y'], 'erp')).toBe(false);
  });

  it('is vacuously true for an empty list', () => {
    expect(allInNamespace([], 'erp')).toBe(true);
  });
});
