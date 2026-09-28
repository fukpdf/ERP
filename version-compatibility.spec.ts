// Requires a test DB. See ./README.md. The invariant this would check
// (G18: publishing v2 never mutates or breaks a v1 instance) is
// exercised at the pure-logic level in
// packages/workflow-engine/src/__tests__/executor.spec.ts's "instance
// survives a restart" case, which rehydrates from a frozen JSON
// snapshot exactly the way a pinned-version instance would.
describe.skip('Version compatibility (needs DB)', () => {
  it('running v1 instance is unaffected by publishing v2', () => {});
});
