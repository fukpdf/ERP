# XSS Prevention

## Layered defense

1. **Output encoding** — React auto-escapes all values rendered via
   JSX expressions (`{value}`). This is the primary defense and
   requires no extra code as long as `dangerouslySetInnerHTML` is
   avoided.
2. **Sanitization for any user-authored HTML** — if a feature needs to
   render user HTML (rich text fields), it MUST go through DOMPurify
   client-side before `dangerouslySetInnerHTML`, per the Semgrep rule
   `no-dangerouslySetInnerHTML-unsanitized`
   (`tools/security/sast/semgrep-rules.yaml`). `apps/web/src/security/safe-html.tsx`
   is the sanctioned wrapper component (referenced in the file list;
   not included as working code in this slice — see MANIFEST.md).
3. **CSP** — blocks inline `<script>` execution except with the
   per-request nonce (`buildCsp()` in
   `packages/security/src/headers/security-headers.ts`). Even if an
   XSS payload gets injected into the DOM, CSP prevents it from
   executing as a `<script>` tag without the nonce.
4. **HttpOnly + Secure + SameSite cookies** — even a successful XSS
   can't read the session cookie via `document.cookie`.
5. **Server-side escaping helper** — `escapeHtml()` in
   `packages/security/src/input/sanitizer.ts`, for any server-rendered
   HTML (emails, PDF generation, etc.) where React's auto-escaping
   doesn't apply.

## What this does NOT cover in this slice

- The actual DOMPurify wrapper component (`safe-html.tsx`) referenced
  in the file tree is not implemented here — it's frontend app code
  outside M15's isolated `packages/security` scope, listed as a
  pending item in MANIFEST.md.
- Stored XSS testing against a live app hasn't been run (no live app).

## Testing

- Unit: `escapeHtml()` covered in `sanitizer.spec.ts`.
- Manual/pentest: attempt `<script>`, `<img onerror=...>`,
  `javascript:` URI payloads in every user-text field; verify none
  execute. Not yet run against a live instance.
