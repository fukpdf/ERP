import { test } from "node:test";
import assert from "node:assert/strict";
import { canUseEntitlement, paymentIdempotencyKey, transitionSubscription, validateMoney } from "./src/index.ts";

test("subscription lifecycle is deterministic",()=>assert.equal(transitionSubscription("ACTIVE","PAUSE"),"PAUSED"));
test("invalid subscription transition fails closed",()=>assert.throws(()=>transitionSubscription("CANCELLED","PAUSE")));
test("payment idempotency key is deterministic",()=>assert.equal(paymentIdempotencyKey("stripe","abc"),"stripe:abc"));
test("entitlement respects time window and status",()=>{
 const now=new Date("2026-09-29T00:00:00Z");
 assert.equal(canUseEntitlement("ACTIVE",new Date("2026-09-28T00:00:00Z"),new Date("2026-09-30T00:00:00Z"),now),true);
 assert.equal(canUseEntitlement("SUSPENDED",new Date("2026-09-28T00:00:00Z"),undefined,now),false);
});
test("money validation fails closed",()=>assert.throws(()=>validateMoney(-1)));
