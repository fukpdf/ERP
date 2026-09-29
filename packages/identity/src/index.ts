export type IdentityId=string&{readonly __identityId:unique symbol};
export interface Identity{id:IdentityId;email:string;status:"ACTIVE"|"SUSPENDED"|"DISABLED"}
export function normalizeEmail(email:string):string{const value=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error("Invalid email");return value}