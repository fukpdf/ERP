// Full E2E (define -> trigger -> approve -> complete) requires a running
// API + Postgres. Unavailable in the build sandbox. See ../README.md.
// The equivalent *logic* path (condition branch -> approval pause ->
// signal resume -> action -> end) IS exercised for real in
// packages/workflow-engine/src/__tests__/executor.spec.ts.
describe.skip('PO approval E2E (needs running API + Postgres)', () => {
  it('define -> create PO -> workflow starts -> manager approves -> finance approves -> vendor notified -> complete', () => {});
});
