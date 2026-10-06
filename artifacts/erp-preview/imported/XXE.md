# XXE (XML External Entity) Prevention

## Status: guidance only — no XML parsing code in this module

This M15 slice doesn't introduce any XML parsing. The guidance below is
for whichever module handles XML (e.g., document import/export in
M3.8, or any SOAP-based third-party integration):

- Disable external entity resolution and DTD processing by default in
  whatever XML parser is used (e.g., in Node's `libxmljs2`:
  `noent: false, dtdload: false`; in Python's `lxml`:
  `resolve_entities=False`).
- Prefer a parser/library that disables external entities by default
  and requires explicit opt-in to re-enable (safer default).
- If accepting XML uploads from users, treat them as untrusted input
  and parse in a sandboxed/resource-limited context (entity expansion
  / "billion laughs" DoS is a related risk, not just data exfiltration
  via XXE).

## Verification

Add to `tools/pentest/checklist/` if/when a module introduces XML
parsing — not currently a distinct checklist item since no XML
ingestion point exists yet in what's been built.
