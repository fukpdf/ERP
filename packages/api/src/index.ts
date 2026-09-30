export type ApiVersion="v1"|"v2";
export interface ApiRequestMeta{version:ApiVersion;correlationId:string;tenantId?:string}
export interface PageCursor{createdAt:string;id:string}
export function apiPath(version:ApiVersion,resource:string):string{if(!resource.trim())throw new Error("resource is required");return `/api/${version}/${resource.replace(/^\/+/, "")}`}
export function parseApiVersion(value:string|undefined):ApiVersion{if(value==="v1"||value==="v2")return value;if(!value)throw new Error("API version is required");throw new Error("unsupported API version")}
export function encodeCursor(cursor:PageCursor):string{return Buffer.from(JSON.stringify(cursor),"utf8").toString("base64url")}
export function decodeCursor(value:string):PageCursor{try{const parsed=JSON.parse(Buffer.from(value,"base64url").toString("utf8"));if(typeof parsed.createdAt!=="string"||typeof parsed.id!=="string")throw new Error();return parsed}catch{throw new Error("invalid pagination cursor")}}
