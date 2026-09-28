# Input Validation

## Principle
Validate on the server, always — client-side validation is a UX
convenience, never a security control.

## Implemented validators
`packages/security/src/input/validators.ts`:
- `isValidEmail`, `isValidPhoneE164`, `isValidUrl` (with protocol
  allowlist)
- `meetsPasswordPolicy` (length + complexity)
- `isPasswordPwned` (HIBP k-anonymity check, network call left to
  caller)

## File upload validation
The spec calls for `input/file-upload.ts` (type/size/virus-scan
checks). **Not implemented** in this slice — would need to be wired
into whichever storage service (M3.8 Documents module) handles
uploads, and virus scanning requires an external engine (ClamAV or a
cloud provider's scanning API) that isn't available in this sandbox.
Guidance for whoever implements it:
- Validate file type by content-sniffing (magic bytes), not just the
  extension or client-supplied MIME type.
- Enforce a max size limit before reading the full file into memory.
- Scan with ClamAV or a cloud AV service before the file is available
  for download by other users.
- Store uploads outside the web root, serve via a signed URL /
  controller, never as a static file directly.

## General rule
Every DTO in the API layer should use class-validator (or equivalent)
decorators — this is standard Nest practice already expected from
other modules, not something M15 re-implements, but M15's Semgrep
config can be extended with a rule flagging any controller method
missing a validated DTO parameter (not currently included).
