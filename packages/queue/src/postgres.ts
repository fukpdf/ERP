import {Prisma,PrismaClient} from "@prisma/client";
export async function enqueueJob(db:PrismaClient|Prisma.TransactionClient,input:{tenantId:string;type:string;payload:Prisma.InputJsonValue;idempotencyKey:string;maxAttempts?:number}){
  return db.queueJob.upsert({where:{tenantId_idempotencyKey:{tenantId:input.tenantId,idempotencyKey:input.idempotencyKey}},create:{tenantId:input.tenantId,type:input.type,payload:input.payload,idempotencyKey:input.idempotencyKey,maxAttempts:input.maxAttempts??5},update:{}});
}
export async function claimJob(db:PrismaClient|Prisma.TransactionClient,tenantId:string,type:string,now=new Date()){
  const rows=await db.$queryRaw<[{id:string}]>(Prisma.sql`UPDATE "QueueJob" SET "status"='RUNNING',"attempt"="attempt"+1,"claimedAt"=now(),"updatedAt"=now() WHERE "id"=(SELECT "id" FROM "QueueJob" WHERE "tenantId"=${tenantId} AND "type"=${type} AND "status"='PENDING' AND "availableAt"<=${now} AND "attempt"<"maxAttempts" ORDER BY "availableAt","createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING "id"`);
  return rows[0]?.id?db.queueJob.findUnique({where:{id:rows[0].id}}):undefined;
}
export async function completeJob(db:PrismaClient|Prisma.TransactionClient,id:string){return db.queueJob.update({where:{id},data:{status:"SUCCEEDED",completedAt:new Date()}})}
export async function failJob(db:PrismaClient|Prisma.TransactionClient,id:string,error:string,retryAt?:Date){return db.queueJob.update({where:{id},data:{status:retryAt?"PENDING":"FAILED",lastError:error,availableAt:retryAt??new Date()}})}
