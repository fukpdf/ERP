interface Bucket{hits:number[];lastSeen:number}
export interface RateLimitResult{allowed:boolean;remaining:number;resetAt:number}
export class SlidingWindowLimiter{
 private buckets=new Map<string,Bucket>();
 constructor(private o:{limit:number;windowMs:number;maxKeys?:number}){if(o.limit<=0||o.windowMs<=0)throw new Error("invalid limiter policy");}
 check(key:string,now=Date.now()):RateLimitResult{if(!key||key.length>512)throw new Error("invalid rate-limit key");const cutoff=now-this.o.windowMs;let b=this.buckets.get(key);if(!b){if(this.buckets.size>=(this.o.maxKeys??10000))this.evict();b={hits:[],lastSeen:now};this.buckets.set(key,b);}b.hits=b.hits.filter(t=>t>cutoff);const allowed=b.hits.length<this.o.limit;if(allowed)b.hits.push(now);b.lastSeen=now;return{allowed,remaining:Math.max(0,this.o.limit-b.hits.length),resetAt:(b.hits[0]??now)+this.o.windowMs};}
 size(){return this.buckets.size;}
 private evict(){let k:string|undefined,old=Infinity;for(const [key,b] of this.buckets)if(b.lastSeen<old){old=b.lastSeen;k=key;}if(k)this.buckets.delete(k);}
}
