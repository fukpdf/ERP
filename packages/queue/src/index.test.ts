import {test} from "node:test";import assert from "node:assert/strict";import {nextRetryAt,shouldRetry,queueIdempotencyKey} from "./index.js";
test("retry backoff is bounded",()=>{const before=Date.now();const d=nextRetryAt(8,1000,5000).getTime();assert.ok(d>=before+5000&&d<=before+5010)});
test("retry budget is deterministic",()=>{assert.equal(shouldRetry(1,2),true);assert.equal(shouldRetry(2,2),false)});
test("queue idempotency is tenant scoped",()=>{assert.notEqual(queueIdempotencyKey("a","email","1"),queueIdempotencyKey("b","email","1"));assert.equal(queueIdempotencyKey(undefined,"email","1"),"global:email:1")});
