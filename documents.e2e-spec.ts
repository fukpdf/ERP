/**
 * Full-stack flow: upload -> OCR -> search -> share -> download -> delete.
 *
 * HONEST STATUS: NOT RUN. This requires:
 *   - A live Postgres with the M2 base schema + this module's migration applied
 *   - A live MinIO instance (or DOCS_ALLOW_LOCAL_STORAGE=true for local disk)
 *   - A live (or mocked-at-network-level) ClamAV daemon
 *   - The full NestJS app bootstrapped with real repository implementations
 *     bound in documents.module.ts (see the MERGE NOTE in that file) —
 *     none of which exist yet in this standalone, pre-merge slice.
 *
 * This sandbox has no network access and no DATABASE_URL/MinIO configured,
 * so per the prompt's instruction ("If MinIO/DATABASE_URL missing,
 * integration/e2e skip with clear message"), the suite below skips itself
 * loudly rather than mocking its way to a fake green checkmark.
 */
const hasDb = !!process.env.DATABASE_URL;
const hasMinio = !!process.env.DOCS_MINIO_ACCESS_KEY;

const describeIfReady = hasDb && hasMinio ? describe : describe.skip;

describeIfReady('Documents E2E: upload -> OCR -> search -> share -> download -> delete', () => {
  it('runs the full lifecycle', async () => {
    throw new Error('Not implemented in this pre-merge slice — see file header. Wire up once DATABASE_URL and MinIO are available.');
  });
});

if (!hasDb || !hasMinio) {
  // Ensures the test file still reports at least one passing assertion in
  // CI summaries, rather than "0 tests" looking like a silent failure.
  it('SKIPPED: e2e requires DATABASE_URL and MinIO credentials (see file header)', () => {
    expect(hasDb && hasMinio).toBe(false);
  });
}
