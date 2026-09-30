import { createHmac,randomBytes,timingSafeEqual } from "node:crypto";
const safe=new Set(["GET","HEAD","OPTIONS"]);
const sign=(sid:string,nonce:string,secret:string)=>createHmac("sha256",secret).update(sid).update("\0").update(nonce).digest("base64url");
export function createCsrfToken(sessionId:string,secret:string):string { if(!sessionId||!secret)throw new Error("CSRF session and secret are required"); const n=randomBytes(32).toString("base64url"); return n+"."+sign(sessionId,n,secret); }
export function verifyCsrfToken(sessionId:string,token:string|undefined,secret:string):boolean { if(!token||!sessionId||!secret||token.length>512)return false; const p=token.split("."); if(p.length!==2)return false; const a=Buffer.from(p[1]),b=Buffer.from(sign(sessionId,p[0],secret)); return a.length===b.length&&timingSafeEqual(a,b); }
export function requiresCsrf(method:string):boolean{return !safe.has(method.toUpperCase());}
export function validateOrigin(origin:string|undefined,allowed:readonly string[]):boolean{return !!origin&&allowed.includes(origin);}
