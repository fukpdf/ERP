import {test} from "node:test";import assert from "node:assert/strict";import {tenantCacheKey,boundedTtlSeconds} from "./index.js";
test("cache keys cannot cross tenants",()=>assert.notEqual(tenantCacheKey("a","users","1"),tenantCacheKey("b","users","1")));
test("cache ttl is bounded",()=>{assert.equal(boundedTtlSeconds(0),1);assert.equal(boundedTtlSeconds(90000),86400);assert.equal(boundedTtlSeconds(30.9),30)});
