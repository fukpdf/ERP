import {test} from "node:test";import assert from "node:assert/strict";import {InMemoryProviderRegistry} from "./index.js";
test("provider registry isolates capabilities",()=>{const r=new InMemoryProviderRegistry();const a={name:"mail",execute:async()=>({ok:true})};r.register("email",a);assert.equal(r.resolve("email").name,"mail");assert.throws(()=>r.resolve("payment"))});
test("duplicate provider registration is rejected",()=>{const r=new InMemoryProviderRegistry();const a={name:"a",execute:async()=>1};r.register("x",a);assert.throws(()=>r.register("x",a))});
