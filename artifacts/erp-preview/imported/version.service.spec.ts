// Requires @nestjs/testing + @prisma/client + a test DB — none available
// in the build sandbox (no network). See ./README.md.
describe.skip('VersionService (needs DB — see test/workflow/README.md)', () => {
  it('publish() always inserts a new immutable row, never updates a prior version', () => {});
  it('latestPublished() resolves to MAX(version) WHERE status = PUBLISHED', () => {});
});
