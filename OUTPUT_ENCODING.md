# Output Encoding

- **HTML context**: React's JSX auto-escapes interpolated values. For
  server-rendered HTML outside React (emails, PDFs), use `escapeHtml()`
  (`packages/security/src/input/sanitizer.ts`).
- **URL context**: use `encodeURIComponent` for any user value placed
  into a URL query string or path segment — never string-concatenate
  raw user input into a URL.
- **JSON context**: `JSON.stringify` handles escaping correctly by
  default; never hand-build JSON strings via concatenation.
- **SQL context**: not "encoding" — use parameterized queries (see
  SQL_INJECTION.md); encoding/escaping user input for SQL is an
  anti-pattern compared to parameterization.
- **Shell context**: avoid entirely — use `execFile` with an argv
  array, never build a shell command string from user input. If
  unavoidable, `stripShellMetacharacters()` is provided as
  defense-in-depth, not a substitute for avoiding shell string
  construction.

See XSS.md for how this fits into the broader XSS defense layers.
