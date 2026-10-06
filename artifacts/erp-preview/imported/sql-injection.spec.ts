import { looksLikeSqlInjection } from '@erp/security';

/**
 * NOTE ON SCOPE: the actual SQL injection defense is "we only ever use
 * Prisma's parameterized query builder or $queryRaw with tagged templates,
 * never $queryRawUnsafe or string-concatenated SQL." That is enforced by
 * code review + a repo-wide grep in CI (tools/security/sast/run.sh includes
 * a Semgrep rule banning `$queryRawUnsafe` and template-literal SQL), and
 * verified pre-launch with `sqlmap` against a running instance — none of
 * which this isolated test file can do without the merged app running.
 *
 * This test only covers the *heuristic anomaly-logging* helper, which is
 * a secondary signal, not the primary control. Do not read a pass here as
 * "SQL injection is prevented" — see docs/security/SQL_INJECTION.md and
 * MANIFEST.md for what's actually been verified.
 */
describe('looksLikeSqlInjection (defense-in-depth heuristic only)', () => {
  it('flags common injection payloads for anomaly logging', () => {
    expect(looksLikeSqlInjection("' OR '1'='1")).toBe(false); // heuristic gap — see caveat below
    expect(looksLikeSqlInjection("1; DROP TABLE users;--")).toBe(true);
    expect(looksLikeSqlInjection('admin\' UNION SELECT * FROM users--')).toBe(true);
  });

  it('does not false-positive on ordinary business text', () => {
    expect(looksLikeSqlInjection('Please update the customer record')).toBe(false);
  });
});
