import {test} from "node:test";import assert from "node:assert/strict";import {chooseReadEndpoint,shardForTenant} from "./index.js";
test("strong reads require primary",()=>assert.equal(chooseReadEndpoint([{role:"PRIMARY",region:"us",healthy:true,weight:1}], "strong","us").role,"PRIMARY"));
test("eventual reads prefer local replica",()=>assert.equal(chooseReadEndpoint([{role:"REPLICA",region:"us",healthy:true,weight:1},{role:"PRIMARY",region:"eu",healthy:true,weight:1}],"eventual","us").region,"us"));
test("tenant shard selection is deterministic",()=>assert.equal(shardForTenant("tenant-a",16),shardForTenant("tenant-a",16)));
