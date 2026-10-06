# HSM (Hardware Security Module)

## Scope
Per the amendment, the control plane (highest security tier) uses HSM
for key storage; customer environments use Vault-managed keys unless
an enterprise customer specifically contracts for dedicated HSM.

## Terraform provided
- `infra/security-hardening/hsm/aws-cloudhsm.tf` — AWS CloudHSM v2
  cluster, HA-ready (one HSM per AZ recommended, this provides one —
  add more `aws_cloudhsm_v2_hsm` resources per additional AZ for real
  HA).
- `azure-managed-hsm.tf` — Azure Key Vault Managed HSM.
- `oracle-hsm.tf` — OCI KMS virtual-private (HSM-backed) vault, for
  customer environments specifically targeting OCI.

## What's NOT done
- None of this Terraform has been applied — no cloud account exists
  in this delivery environment.
- CloudHSM specifically requires a **manual post-apply activation
  step** (initialize the cluster, sign a CSR, activate) that Terraform
  cannot automate — documented as a comment in the `.tf` file, not
  automated here.
- The application-level HSM client (`hsm-client.ts` in the original
  file plan, under `packages/security/src/secrets/`) that would
  actually use the HSM for key operations at runtime is **not
  implemented**.

## Recommendation
Given the amendment scopes HSM to "enterprise" / control-plane use
specifically, and given the operational complexity above, confirm with
the merge captain whether HSM is truly needed for the initial launch
or whether Vault Transit (software-based key management with strong
access controls) is sufficient for SOC 2 Type I, deferring HSM to
before the higher-assurance ISO 27001 target.
