# Phase 0 — Documentation Gap Register

Baseline: `b398ae159a8e69b784f46dc8d1d0715f552c078a`

The following documentation targets were referenced by the historical README but are absent from the canonical current Git tree:

| Expected path | Current status | Action |
|---|---|---|
| `INSECURE_DESERIALIZATION.md` | MISSING | Recreate only from a verified historical source or explicitly retire the reference |
| `BUG_BOUNTY.md` | MISSING | Recreate only from a verified historical source or explicitly retire the reference |
| `PCI_DSS_CONTROLS.md` | MISSING | Recreate only if PCI scope is approved and source requirements are verified |
| `IR_PLAYBOOKS/` | MISSING | Recreate directory and playbooks from verified source material before linking |

These are intentionally **not fabricated** during Phase 0. The README now avoids broken links and records the gaps instead.

## Phase 0 verification result

- Canonical tree is machine-inventoried.
- Historical-vs-current file-count discrepancy is explicitly recorded.
- Broken documentation references were identified and reconciled.
- Missing security/compliance artifacts remain visible as MISSING rather than being falsely marked implemented.
