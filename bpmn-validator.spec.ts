// This is the thin Nest wrapper around @erp/workflow-engine's
// validateDefinition (services/bpmn-validator.service.ts). The
// underlying logic is ALREADY unit-tested for real — see
// packages/workflow-engine/src/__tests__/validator.spec.ts (orphans,
// cycles, missing end, all passing, see MANIFEST.md for the exact
// output). This file only needs @nestjs/testing to instantiate the
// service via DI, which was unavailable offline. See ./README.md.
describe.skip('BpmnValidatorService (needs @nestjs/testing — core logic already verified in @erp/workflow-engine)', () => {
  it('delegates to validateDefinition and returns its result unchanged', () => {});
});
