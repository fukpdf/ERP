export interface CachePort{get<T>(key:string):Promise<T|undefined>;set<T>(key:string,value:T,ttlSeconds:number):Promise<void>;delete(key:string):Promise<void>}
export function tenantCacheKey(tenantId:string,namespace:string,key:string):string{if(!tenantId||!namespace||!key)throw new Error("tenant, namespace and key are required");return `erp:${tenantId}:${namespace}:${key}`}
export function boundedTtlSeconds(ttl:number,min=1,max=86400):number{if(!Number.isFinite(ttl))throw new Error("ttl must be finite");return Math.max(min,Math.min(max,Math.floor(ttl)))}
