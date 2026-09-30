import test from "node:test";
import assert from "node:assert/strict";
import { executeWorkflow, validateWorkflow } from "./src/index.js";

test("workflow rejects duplicate step order",()=>assert.throws(()=>validateWorkflow({key:"x",version:1,steps:[{key:"a",order:1,type:"ACTION",configuration:{}},{key:"b",order:1,type:"ACTION",configuration:{}}]})));
test("workflow executes ordered actions",async()=>{
 const result=await executeWorkflow({key:"x",version:1,steps:[{key:"a",order:2,type:"ACTION",configuration:{action:"add"}},{key:"b",order:1,type:"ACTION",configuration:{action:"add"}}]},{input:{},output:{},correlationId:"c"},{add:async(ctx)=>({count:Number(ctx.output.count??0)+1})});
 assert.equal(result.status,"SUCCEEDED"); assert.equal(result.output.count,2);
});
test("workflow fails closed for unknown action",async()=>{
 const result=await executeWorkflow({key:"x",version:1,steps:[{key:"a",order:1,type:"ACTION",configuration:{action:"missing"}}]},{input:{},output:{},correlationId:"c"},{});
 assert.equal(result.status,"FAILED");
});
