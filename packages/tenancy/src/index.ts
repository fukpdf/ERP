export type TenantId=string&{readonly __tenantId:unique symbol};
export function tenantId(value:string):TenantId{if(!/^[0-9a-fA-F-]{16,64}$/.test(value))throw new Error("Invalid tenant id");return value as TenantId}
export interface TenantContext{tenantId:TenantId;actorId:string;correlationId:string}
export function requireTenantContext(ctx:TenantContext|null|undefined):TenantContext{if(!ctx?.tenantId||!ctx.actorId||!ctx.correlationId)throw new Error("Tenant context is required");return ctx}