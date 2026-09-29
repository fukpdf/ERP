import test from "node:test";
import assert from "node:assert/strict";
import { isSessionActive } from "../auth/src/index.js";
import { normalizeEmail } from "../identity/src/index.js";
import { requirePermission } from "../rbac/src/index.js";
import { requireTenantContext, tenantId } from "../tenancy/src/index.js";
import { loadConfig } from "../config/src/index.js";

test("tenant context fails closed",()=>{assert.throws(()=>requireTenantContext(null));assert.equal(tenantId("1234567890abcdef"),"1234567890abcdef")});
test("identity normalization is deterministic",()=>assert.equal(normalizeEmail(" USER@Example.COM "),"user@example.com"));
test("session is active only before expiry and before revocation",()=>{const now=new Date("2026-01-01T00:00:00Z");assert.equal(isSessionActive({id:"s",identityId:"i",expiresAt:new Date("2026-01-02"),revokedAt:null},now),true);assert.equal(isSessionActive({id:"s",identityId:"i",expiresAt:new Date("2025-12-31"),revokedAt:null},now),false);assert.equal(isSessionActive({id:"s",identityId:"i",expiresAt:new Date("2026-01-02"),revokedAt:now},now),false)});
test("authorization denies missing permission",()=>assert.throws(()=>requirePermission({tenantId:"t",identityId:"i",permissions:new Set()},"erp.read")));
test("configuration fails closed",()=>{assert.throws(()=>loadConfig({}));const c=loadConfig({DATABASE_URL:"postgresql://example/erp"});assert.equal(c.sessionTtlSeconds,43200)});
