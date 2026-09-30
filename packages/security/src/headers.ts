import { randomBytes } from "node:crypto";
export function createCspNonce(): string { return randomBytes(16).toString("base64url"); }
export function buildSecurityHeaders(o: { nonce?: string; production?: boolean } = {}): Record<string,string> {
  const nonce=o.nonce??createCspNonce();
  const h:Record<string,string>={
    "Content-Security-Policy":"default-src 'self'; script-src 'self' 'nonce-"+nonce+"'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
    "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"strict-origin-when-cross-origin",
    "Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=()","Cross-Origin-Opener-Policy":"same-origin",
    "Cross-Origin-Resource-Policy":"same-origin","X-DNS-Prefetch-Control":"off","X-XSS-Protection":"0","Cache-Control":"no-store"
  };
  if(o.production) h["Strict-Transport-Security"]="max-age=31536000; includeSubDomains";
  return h;
}
export function resolveCorsOrigin(origin:string|undefined, allowlist:readonly string[]):string|undefined { return origin&&allowlist.includes(origin)?origin:undefined; }
