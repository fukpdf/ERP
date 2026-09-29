export type TenantId=string&{readonly __tenantId:unique symbol};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function tenantId(value:string):TenantId{if(!UUID.test(value))throw new Error("Invalid tenant id");return value as TenantId}
export interface TenantContext{tenantId:TenantId;actorId:string;correlationId:string}
export function requireTenantContext(ctx:TenantContext|null|undefined):TenantContext{if(!ctx?.tenantId||!ctx.actorId||!ctx.correlationId)throw new Error("Tenant context is required");return ctx}
