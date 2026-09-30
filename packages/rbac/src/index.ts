export type Permission=string;
export interface AuthorizationSubject{tenantId:string;identityId:string;permissions:ReadonlySet<Permission>}
export function can(subject:AuthorizationSubject,permission:Permission){return subject.permissions.has(permission)}
export function requirePermission(subject:AuthorizationSubject,permission:Permission){if(!can(subject,permission))throw new Error("Forbidden")}