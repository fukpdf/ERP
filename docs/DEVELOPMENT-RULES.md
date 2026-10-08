# Universal ERP Development Rules & Engineering Standards

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Enforcement:** Mandatory for All Engineers and AI Agents  
**Zero-Tolerance Policy:** Rule violations block merges and require immediate remediation.

---

## 1. The Mandatory Engineering Lifecycle

Every code change, feature addition, or refactoring task must follow this exact lifecycle:

$$\text{AUDIT} \longrightarrow \text{IMPLEMENT} \longrightarrow \text{VALIDATE} \longrightarrow \text{VERIFY} \longrightarrow \text{RE-AUDIT} \longrightarrow \text{FIX} \longrightarrow \text{VALIDATE AGAIN}$$

1. **AUDIT:** Inspect existing contracts, dependencies, and file structures before modifying or creating code.
2. **IMPLEMENT:** Write clean, modular, typed code adhering strictly to domain boundaries and contract specifications.
3. **VALIDATE:** Execute unit and integration tests against real databases and mock contracts.
4. **VERIFY:** Execute `compile_applet`, `lint_applet`, and typecheck to prove zero regressions.
5. **RE-AUDIT:** Check diffs against architecture rules (zero circular imports, zero unauthorized external packages).
6. **FIX DEFICIENCIES:** Address any linter warnings, type errors, or boundary violations immediately.
7. **VALIDATE AGAIN:** Confirm clean build and test pass before declaring task completion.

---

## 2. The Twelve Inviolable Engineering Rules

| # | Inviolable Rule | Explicit Prohibition & Standard |
| :-: | :--- | :--- |
| **1** | **NO FAKE IMPLEMENTATIONS** | Never stub business logic with dummy hardcoded strings or no-op handlers in production paths. |
| **2** | **NO FAKE TESTS** | Never write assertions that pass trivially without testing real logic. No mocking the system under test. |
| **3** | **NO FAKE APIS** | Endpoints must implement full schema validation (Zod) and typed error envelopes. |
| **4** | **NO FAKE DATABASE** | Never claim a database model exists or works unless verified in the schema and database migrations. |
| **5** | **NO SILENT DELETION** | Never delete existing code, specs, or docs without explicit documented justification and approval. |
| **6** | **NO UNNECESSARY DEPENDENCIES**| Do not install npm packages for trivial tasks easily solved with standard Node.js or TypeScript primitives. |
| **7** | **NO GIANT MONOLITHIC FILES** | Strict line ceilings: Services $\le 300$ lines, Controllers $\le 150$ lines, Components $\le 200$ lines. |
| **8** | **NO CIRCULAR ARCHITECTURE** | Circular dependencies between packages, modules, or files are fatal build errors. |
| **9** | **NO UNDOCUMENTED CHANGES** | Every architectural decision must be logged in `docs/DECISIONS.md`. |
| **10** | **NO DESTRUCTIVE GIT/FS OPS** | Never run destructive resets, forced file purges, or unapproved data wipes. |
| **11** | **NO UNAPPROVED DB MIGRATIONS** | Database schema modifications require forward-backward migration scripts and peer review. |
| **12** | **NO CLAIMING PASS WITHOUT EVIDENCE**| Never state that a feature or test works without executing verification commands and providing output. |

---

## 3. Definition of Done (DoD)

A task or pull request is **COMPLETE** if and only if:
- [ ] TypeScript compiles cleanly with zero errors (`tsc --build`).
- [ ] Linter passes with zero warnings or errors (`npm run lint`).
- [ ] Unit and integration tests pass with 100% assertions executed.
- [ ] Dependency boundaries respected (zero prohibited imports or circular references).
- [ ] Public contracts and DTOs updated and documented.
- [ ] Architecture documentation updated if architectural choices were made.
