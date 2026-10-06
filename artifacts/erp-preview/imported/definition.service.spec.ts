// Requires @nestjs/testing + @prisma/client + a test DB — none available
// in the build sandbox (no network). See ./README.md.
describe.skip('DefinitionService (needs DB — see test/workflow/README.md)', () => {
  it('creates a draft, rejects malformed steps at publish time, not at create time', () => {});
});
