import {test} from "node:test";import assert from "node:assert/strict";import {apiPath,encodeCursor,decodeCursor,parseApiVersion} from "./index.js";
test("versioned API paths are deterministic",()=>assert.equal(apiPath("v1","customers"),"/api/v1/customers"));
test("cursor round trip is stable",()=>{const c={createdAt:"2026-01-01T00:00:00.000Z",id:"abc"};assert.deepEqual(decodeCursor(encodeCursor(c)),c)});
test("unknown versions are rejected",()=>assert.throws(()=>parseApiVersion("v9")));
