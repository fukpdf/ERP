import { PrismaClient, Prisma } from "@prisma/client";
import { tenantId, TenantId } from "../tenancy/src/index.js";

export async function withTenantTransaction<T>(db:PrismaClient, rawTenantId:string, work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
  const id:TenantId=tenantId(rawTenantId);
  return db.$transaction(async tx=>{
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${id}, true)`);
    return work(tx);
  });
}
