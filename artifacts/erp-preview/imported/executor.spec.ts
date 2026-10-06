// App-level test for engine/in-process.engine.ts's Nest wiring
// (DI, WorkflowInstanceRepository calls). The step-dispatch logic it
// wraps is already unit-tested for real in
// packages/workflow-engine/src/__tests__/executor.spec.ts (approval
// pause/resume, restart survival, condition branching — all passing).
// This file needs @nestjs/testing + a test DB, unavailable offline.
// See ./README.md.
describe.skip('InProcessEngine (needs @nestjs/testing + test DB — core dispatch logic already verified in @erp/workflow-engine)', () => {
  it('start() persists initial state via WorkflowInstanceRepository', () => {});
  it('signal() resumes a waiting instance and re-persists final state', () => {});
});
