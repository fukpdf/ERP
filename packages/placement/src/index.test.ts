import {test} from "node:test";import assert from "node:assert/strict";import {choosePlacement,validateRegion} from "./index.js";
test("placement excludes unhealthy targets",()=>assert.equal(choosePlacement([{region:"a1",provider:"p",weight:1,healthy:false},{region:"b1",provider:"p",weight:1,healthy:true}],"x").region,"b1"));
test("region identifiers are validated",()=>assert.equal(validateRegion("us-east-1"),"us-east-1"));
