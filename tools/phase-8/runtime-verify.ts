import {PrismaClient,Prisma} from "@prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {enqueueJob,claimJob,completeJob} from "../../packages/queue/src/postgres.js";
const adminUrl=process.env.DATABASE_URL,appUrl=process.env.APP_DATABASE_URL;
if(!adminUrl||!appUrl)throw new Error("DATABASE_URL and APP_DATABASE_URL are required");
const admin=new PrismaClient({adapter:new PrismaPg({connectionString:adminUrl})});
const app=new PrismaClient({adapter:new PrismaPg({connectionString:appUrl})});
const tenant=await admin.tenant.create({data:{name:"phase8-"+crypto.randomUUID()}});
try{
 await app.$transaction(async tx=>{await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id',${tenant.id},true)`);
 const job=await enqueueJob(tx,{tenantId:tenant.id,type:"phase8.probe",payload:{ok:true},idempotencyKey:"probe-1"});
 const duplicate=await enqueueJob(tx,{tenantId:tenant.id,type:"phase8.probe",payload:{ok:false},idempotencyKey:"probe-1"});
 if(job.id!==duplicate.id)throw new Error("queue idempotency failed");
 const claimed=await claimJob(tx,tenant.id,"phase8.probe");if(!claimed)throw new Error("queue claim failed");
 await completeJob(tx,claimed.id);
 });
 const completed=await app.$transaction(async tx=>{await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id',${tenant.id},true)`);return tx.queueJob.count({where:{tenantId:tenant.id,status:"SUCCEEDED"}})});
 console.log(JSON.stringify({queueRuntime:"PASS",tenant:tenant.id,completedJobs:completed}));
 if(completed!==1)throw new Error("queue completion gate failed");
}finally{await admin.tenant.delete({where:{id:tenant.id}}).catch(()=>{});await app.$disconnect();await admin.$disconnect()}
