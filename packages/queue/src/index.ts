export type QueueJobStatus = "PENDING"|"RUNNING"|"SUCCEEDED"|"FAILED"|"DEAD";
export interface QueueJob<T=unknown>{id:string;type:string;payload:T;attempt:number;maxAttempts:number;availableAt:Date;status:QueueJobStatus;idempotencyKey:string;tenantId?:string;}
export interface JobHandler<T=unknown>{(job:QueueJob<T>):Promise<void>}
export interface QueuePort{enqueue<T>(job:Omit<QueueJob<T>,"status"|"attempt">):Promise<QueueJob<T>>;claim<T>(type:string,now:Date):Promise<QueueJob<T>|undefined>;complete(id:string):Promise<void>;fail(id:string,availableAt:Date):Promise<void>;deadLetter(id:string):Promise<void>}
export function nextRetryAt(attempt:number,baseMs=1000,maxMs=60000,jitter=0):Date{if(!Number.isInteger(attempt)||attempt<1)throw new Error("attempt must be positive");const delay=Math.min(maxMs,baseMs*2**(attempt-1));return new Date(Date.now()+delay+jitter)}
export function shouldRetry(attempt:number,maxAttempts:number):boolean{return Number.isInteger(attempt)&&Number.isInteger(maxAttempts)&&attempt<maxAttempts}
export function queueIdempotencyKey(tenantId:string|undefined,type:string,key:string):string{if(!type.trim()||!key.trim())throw new Error("type and key are required");return `${tenantId??"global"}:${type}:${key}`}
