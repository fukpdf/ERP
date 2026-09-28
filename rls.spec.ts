// Requires a live Postgres with the RLS policies from
// prisma/migrations/20260108_workflow_extras/migration.sql actually
// applied — cannot be verified without one. See ./README.md.
describe.skip('Tenant isolation / RLS (needs live Postgres)', () => {
  it('tenant A cannot query tenant B workflow_instances rows', () => {});
});
