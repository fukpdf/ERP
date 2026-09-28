# SBOM (Software Bill of Materials)

## Generation
`tools/security/sbom/generate-sbom.sh` uses Syft to produce an
SPDX-format SBOM (`sbom.spdx.json`) covering every dependency across
the monorepo. Wired into `security.yml` CI as the `sbom` job, uploaded
as a build artifact.

## Use cases
1. **Vulnerability matching** — `vulnerability-match.sh` feeds the
   SBOM into Grype to check every listed component against known CVEs,
   independent of whether a specific scan (Snyk/Trivy) was run at that
   moment.
2. **Supply chain incident response** — see
   `docs/security/IR_PLAYBOOKS/supply-chain.md`: when a package is
   found compromised, grep the SBOM to instantly find every affected
   component instead of manually searching lockfiles.
3. **License compliance** — cross-reference with
   `tools/security/license-check/allowlist.json`.

## Status
Script is real and would work against an actual dependency tree. Not
run in this delivery (no installed `node_modules` to scan — this
isolated slice's `package.json` files declare dependencies but nothing
was installed, per the network restriction in this sandbox).
