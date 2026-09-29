import test from "node:test";
import assert from "node:assert/strict";
import { matchAutomation } from "./src/index.js";
test("automation ignores disabled or nonmatching rules",()=>assert.equal(matchAutomation({key:"r",triggerEvent:"sale.created",enabled:false},{tenantId:"t",eventType:"sale.created",eventId:"e",payload:{}}).matched,false));
test("automation generates deterministic tenant-local dedupe input",()=>assert.equal(matchAutomation({key:"r",triggerEvent:"sale.created",enabled:true},{tenantId:"t",eventType:"sale.created",eventId:"e",payload:{}}).dedupeKey,"r:e"));
