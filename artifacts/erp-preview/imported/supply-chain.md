# Playbook: Supply Chain Compromise

## Trigger
A dependency (npm package, base container image, CI action) is found
to be compromised — either via a security advisory, SCA tooling
alert (Snyk/Trivy/Dependabot), or unusual behavior traced to a
third-party package.

## Immediate actions
1. Identify every service/image that depends on the compromised
   package/version — the SBOM (see SBOM.md) is exactly for this:
   query `sbom.spdx.json` (once generated) for the package name to
   find every affected component quickly, rather than manually
   grepping lockfiles.
2. Pin/roll back to a known-good version, or remove the dependency
   entirely if no patched version exists yet.
3. Rebuild and redeploy affected images; re-run container scanning
   (Trivy/Grype) to confirm the vulnerable version is gone.
4. If the compromise indicates the package exfiltrated secrets during
   its compromised window (common in npm supply-chain attacks that
   steal env vars at install time), rotate every secret accessible to
   any build/runtime environment that installed the compromised
   version during that window.

## Prevention (already in place)
- Dependency scanning (Snyk, Trivy, npm audit) in CI, blocking on
  HIGH/CRITICAL.
- SBOM generation for rapid "were we affected" queries.
- Image signing (Cosign) so a tampered image fails verification before
  deployment — assuming `cosign-verify.sh` is actually wired into the
  deploy pipeline's admission control, which is **not done** in this
  slice (the script exists; the Kubernetes admission webhook that
  enforces it at deploy time is not built here).
