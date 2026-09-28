import { buildSecurityHeaders } from '@erp/security';

/**
 * This is a focused unit test of the header builder consumed by
 * SecurityHeadersMiddleware. A full e2e test (supertest against the
 * running Nest app, asserting on actual HTTP responses) belongs in
 * e2e/security.e2e-spec.ts and requires the full app bootstrap from
 * the merged repo — not runnable in this isolated slice.
 */
describe('buildSecurityHeaders', () => {
  const headers = buildSecurityHeaders({ nonce: 'abc123' });

  it('sets HSTS with preload and a 1-year max-age', () => {
    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
  });

  it('sets X-Frame-Options to DENY', () => {
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('sets X-Content-Type-Options to nosniff', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('includes the per-request nonce in the CSP script-src', () => {
    expect(headers['Content-Security-Policy']).toContain("'nonce-abc123'");
  });

  it('denies framing by default via frame-ancestors none', () => {
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('switches header name in report-only mode', () => {
    const reportOnly = buildSecurityHeaders({ reportOnly: true });
    expect(reportOnly['Content-Security-Policy-Report-Only']).toBeDefined();
    expect(reportOnly['Content-Security-Policy']).toBeUndefined();
  });
});
