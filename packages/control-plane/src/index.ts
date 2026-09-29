export type ErpInstanceStatus = "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "DECOMMISSIONING" | "DECOMMISSIONED" | "FAILED";
export type ProvisioningOperationType = "PROVISION" | "DEPROVISION" | "SUSPEND" | "RESUME" | "REPAIR";

const transitions: Record<ErpInstanceStatus, Partial<Record<ProvisioningOperationType, ErpInstanceStatus>>> = {
  PROVISIONING: { PROVISION: "ACTIVE", REPAIR: "ACTIVE" },
  ACTIVE: { SUSPEND: "SUSPENDED", DEPROVISION: "DECOMMISSIONING", REPAIR: "ACTIVE" },
  SUSPENDED: { RESUME: "ACTIVE", DEPROVISION: "DECOMMISSIONING", REPAIR: "ACTIVE" },
  DECOMMISSIONING: { DEPROVISION: "DECOMMISSIONED", REPAIR: "ACTIVE" },
  DECOMMISSIONED: { REPAIR: "ACTIVE" },
  FAILED: { REPAIR: "ACTIVE", DEPROVISION: "DECOMMISSIONING" }
};

export function transitionErpInstanceStatus(status: ErpInstanceStatus, operation: ProvisioningOperationType): ErpInstanceStatus {
  const next = transitions[status][operation];
  if (!next) throw new Error(`invalid ERP lifecycle transition: ${status} -> ${operation}`);
  return next;
}

export function validateProvisioningRequest(input: {
  erpInstanceId: string;
  requestedByAdminId: string;
  operationType: ProvisioningOperationType;
  idempotencyKey: string;
  correlationId: string;
}): void {
  for (const [name, value] of Object.entries(input)) {
    if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  }
}

export function provisioningDedupeKey(erpInstanceId: string, idempotencyKey: string): string {
  if (!erpInstanceId || !idempotencyKey) throw new Error("ERP instance and idempotency key are required");
  return `${erpInstanceId}:${idempotencyKey}`;
}
