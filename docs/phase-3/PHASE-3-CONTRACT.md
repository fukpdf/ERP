# Phase 3 — Workflow & Automation Contract

## Scope
Phase 3 establishes reusable workflow execution and event-driven automation primitives without coupling business domains to infrastructure.

### Capabilities
1. Versioned workflow definitions.
2. Ordered workflow steps.
3. Condition/action/notification step types.
4. Deterministic workflow execution.
5. Workflow run lifecycle and correlation.
6. Event-triggered automation rules.
7. Tenant-scoped automation-run deduplication.
8. PostgreSQL RLS and tenant-aware persistence.
9. Fail-closed behavior for missing actions and invalid workflow definitions.

## Architecture rules
- Workflow execution must be deterministic for the same input, definition, and registered action behavior.
- Domain packages publish domain events; workflow/automation consumes contracts rather than importing domain infrastructure.
- Automation dedupe keys are tenant-local.
- Every persisted workflow/automation record is tenant-scoped.
- Workflow execution must carry a correlation ID.
- No workflow action may silently execute when its action handler is missing.
- Runtime scheduling/queue workers are separate from the deterministic execution core.

## Required persistence
- WorkflowDefinition
- WorkflowStep
- WorkflowRun
- AutomationRule
- AutomationRun

## Exit gate
Static:
- schema + migrations present;
- RLS with USING/WITH CHECK present;
- workflow and automation package boundaries present;
- deterministic execution and matching tests present;
- documentation and schema agree.

Runtime:
- PostgreSQL migration;
- cross-tenant RLS;
- workflow success/failure/condition paths;
- automation event matching;
- duplicate-event idempotency;
- correlation propagation;
- worker retry/cancellation behavior.

Runtime PASS requires real infrastructure evidence. BLOCKED is not PASS.
