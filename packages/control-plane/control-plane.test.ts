import { test } from "node:test";
import assert from "node:assert/strict";
import { provisioningDedupeKey, transitionErpInstanceStatus, validateProvisioningRequest } from "./src/index.ts";

test("valid lifecycle transition is deterministic", () => {
  assert.equal(transitionErpInstanceStatus("ACTIVE", "SUSPEND"), "SUSPENDED");
});

test("invalid lifecycle transition fails closed", () => {
  assert.throws(() => transitionErpInstanceStatus("DECOMMISSIONED", "SUSPEND"));
});

test("provisioning request requires all control-plane identity fields", () => {
  assert.throws(() => validateProvisioningRequest({
    erpInstanceId: "",
    requestedByAdminId: "admin",
    operationType: "PROVISION",
    idempotencyKey: "k1",
    correlationId: "c1"
  }));
});

test("provisioning dedupe key is deterministic", () => {
  assert.equal(provisioningDedupeKey("erp-1", "request-7"), "erp-1:request-7");
});
