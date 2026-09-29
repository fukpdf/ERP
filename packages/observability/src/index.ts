export interface RequestContext{correlationId:string;tenantId?:string;actorId?:string}
export function createCorrelationId():string{return globalThis.crypto?.randomUUID?.()??"correlation-id-unavailable"}
export function withContext<T>(ctx:RequestContext,work:(ctx:RequestContext)=>T):T{if(!ctx.correlationId)throw new Error("correlationId is required");return work(ctx)}