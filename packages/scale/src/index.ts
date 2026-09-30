export type ReadConsistency="strong"|"eventual";
export interface DatabaseEndpoint{role:"PRIMARY"|"REPLICA";region:string;healthy:boolean;weight:number}
export function chooseReadEndpoint(endpoints:readonly DatabaseEndpoint[],consistency:ReadConsistency,region:string):DatabaseEndpoint{
  if(consistency==="strong"){const primary=endpoints.find(e=>e.role==="PRIMARY"&&e.healthy);if(!primary)throw new Error("healthy primary unavailable");return primary}
  const local=endpoints.filter(e=>e.role==="REPLICA"&&e.healthy&&e.region===region&&e.weight>0);if(local.length)return weighted(local,region);
  const replicas=endpoints.filter(e=>e.role==="REPLICA"&&e.healthy&&e.weight>0);if(replicas.length)return weighted(replicas,region);
  const primary=endpoints.find(e=>e.role==="PRIMARY"&&e.healthy);if(primary)return primary;throw new Error("no healthy read endpoint")}
function weighted(xs:readonly DatabaseEndpoint[],seed:string){const total=xs.reduce((n,x)=>n+x.weight,0);let n=hash(seed)%total;for(const x of xs){if(n<x.weight)return x;n-=x.weight}return xs[xs.length-1]}
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function shardForTenant(tenantId:string,shardCount:number):number{if(!Number.isInteger(shardCount)||shardCount<1)throw new Error("shardCount must be positive");return hash(tenantId)%shardCount}
