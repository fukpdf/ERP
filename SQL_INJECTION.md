# SQL Injection Prevention

## The actual control: parameterization, always

- **Prisma's query builder** (`.findMany()`, `.create()`, etc.) is
  parameterized by default — this is the vast majority of queries and
  requires no extra work.
- **Raw SQL**: only `$queryRaw` / `$executeRaw` with *tagged template
  literals* are allowed. `$queryRawUnsafe` / `$executeRawUnsafe` (which
  accept plain strings and are vulnerable to injection if user input
  is concatenated in) are banned by the Semgrep rule
  `no-query-raw-unsafe` (`tools/security/sast/semgrep-rules.yaml`),
  which fails CI on any use.
- **Query builder (M12)**: per the M15 prompt context, M12's query
  builder is AST-based with no string concatenation — that's M12's
  responsibility to maintain; M15 verifies it via the same Semgrep
  scan and pen test, not by re-implementing it.

## What `looksLikeSqlInjection()` is and isn't

`packages/security/src/input/sanitizer.ts` exports a regex-based
heuristic. It is a **secondary signal for anomaly logging** (e.g.,
flag-and-log a request that contains `UNION SELECT` so it shows up in
anomaly monitoring), not a filter that blocks or "cleans" input. Never
rely on it as the actual injection defense — parameterization is the
defense. Relying on blocklist pattern-matching as a primary SQLi
control is itself an anti-pattern (easily bypassed with encoding
tricks), so this module deliberately does not present it as one.

## Verification plan

1. **Static**: Semgrep rule blocks `$queryRawUnsafe` in CI.
2. **Dynamic**: `tools/pentest/scripts/injection-tests.sh` wraps
   `sqlmap` against a running instance. **Not run** — no live instance
   in this delivery. Target: 0 findings.
3. **Code review**: any new raw SQL usage should be flagged in PR
   review regardless of tooling.

## Status: fixed by architecture, pending live verification.
