export interface RequestContext{correlationId:string;tenantId?:string;actorId?:string}
export function createCorrelationId():string{const id=globalThis.crypto?.randomUUID?.();if(!id)throw new Error("Secure correlation id generation is unavailable");return id}
export function withContext<T>(ctx:RequestContext,work:(ctx:RequestContext)=>T):T{if(!ctx.correlationId)throw new Error("correlationId is required");return work(ctx)}
