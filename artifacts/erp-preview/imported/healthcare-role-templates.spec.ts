import { describe, it, expect } from '@jest/globals';
import { HEALTHCARE_ROLE_TEMPLATES, ALL_ROLE_TEMPLATES, roleTemplatesForVertical } from '../../src/modules/rbac/templates/role-templates';
import { DEFAULT_SOD_RULES } from '../../src/modules/rbac/templates/sod-rules';
import { detectSodViolations } from '../../src/modules/rbac/services/sod.service';
import { parsePermissionKey } from '../../src/modules/rbac/services/permission-key.utils';
import { INDUSTRY_VERTICALS } from '../../src/modules/rbac/rbac.constants';

describe('healthcare role templates', () => {
  it('defines exactly the five roles named in the prompt', () => {
    const names = HEALTHCARE_ROLE_TEMPLATES.map((r) => r.name).sort();
    expect(names).toEqual(['Doctor', 'Lab Tech', 'Nurse', 'Pharmacist', 'Reception']);
  });

  it('every healthcare role has at least one permission, and every key parses', () => {
    for (const role of HEALTHCARE_ROLE_TEMPLATES) {
      expect(role.permissionKeys.length).toBeGreaterThan(0);
      for (const key of role.permissionKeys) {
        expect(() => parsePermissionKey(key)).not.toThrow();
      }
    }
  });

  it('reception has no clinical data access (no clinical_note, prescription, or lab_result permissions)', () => {
    const reception = HEALTHCARE_ROLE_TEMPLATES.find((r) => r.key === 'healthcare.reception')!;
    const clinicalResources = ['clinical_note', 'prescription', 'lab_result'];
    const hasClinical = reception.permissionKeys.some((key) => clinicalResources.some((r) => key.includes(`.${r}.`)));
    expect(hasClinical).toBe(false);
  });

  it('only the pharmacist role can dispense prescriptions', () => {
    const dispenseKey = 'erp.healthcare.prescription.dispense';
    const rolesWithDispense = HEALTHCARE_ROLE_TEMPLATES.filter((r) => r.permissionKeys.includes(dispenseKey)).map((r) => r.key);
    expect(rolesWithDispense).toEqual(['healthcare.pharmacist']);
  });

  it('roleTemplatesForVertical(healthcare) includes system roles plus only healthcare industry roles', () => {
    const templates = roleTemplatesForVertical(INDUSTRY_VERTICALS.HEALTHCARE);
    const industryKeys = templates.filter((t) => t.industryVertical).map((t) => t.industryVertical);
    expect(new Set(industryKeys)).toEqual(new Set(['healthcare']));
    expect(templates.length).toBeGreaterThan(HEALTHCARE_ROLE_TEMPLATES.length); // system roles included too
  });

  it('every role template key is unique across the full set', () => {
    const keys = ALL_ROLE_TEMPLATES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('the doctor/pharmacist SoD default rule', () => {
  it('references role keys that actually exist in the healthcare templates', () => {
    const rule = DEFAULT_SOD_RULES.find((r) => r.name === 'Doctor / Pharmacist')!;
    const templateKeys = new Set(HEALTHCARE_ROLE_TEMPLATES.map((r) => r.key));
    for (const key of rule.conflictingRoleKeys) {
      expect(templateKeys.has(key)).toBe(true);
    }
  });

  it('fires when a single user is assigned both roles', () => {
    const rule = { ...DEFAULT_SOD_RULES.find((r) => r.name === 'Doctor / Pharmacist')!, id: 'r-doc-pharm' };
    const violations = detectSodViolations('user-1', ['healthcare.doctor', 'healthcare.pharmacist'], [rule]);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('block');
  });

  it('does not fire for a doctor alone or a pharmacist alone', () => {
    const rule = { ...DEFAULT_SOD_RULES.find((r) => r.name === 'Doctor / Pharmacist')!, id: 'r-doc-pharm' };
    expect(detectSodViolations('u', ['healthcare.doctor'], [rule])).toHaveLength(0);
    expect(detectSodViolations('u', ['healthcare.pharmacist'], [rule])).toHaveLength(0);
  });
});
