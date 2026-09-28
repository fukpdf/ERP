# DDoS Protection

## Layers
1. **Network (L3/L4)** — automatic on Cloudflare for any proxied DNS
   record, or AWS Shield Standard (also automatic/free). No
   configuration needed for the baseline.
2. **Application (L7)** — Cloudflare's HTTP DDoS Attack Protection
   ruleset (`infra/security-hardening/ddos/cloudflare-shield.yaml`,
   sensitivity set to "high") or AWS Shield Advanced + WAF rate-based
   rules (`ddos/aws-shield.tf`, `waf/aws-waf-rules.json`).
3. **Application-level rate limiting** — see RATE_LIMITING.md, a
   second line of defense for requests that get past the edge.

## Status
IaC for both Cloudflare and AWS options is written and syntactically
valid (see infra/security-hardening/ddos/), reflecting that the final
provider choice wasn't specified in the M15 prompt — pick one, don't
run both. **Not applied to real infrastructure** in this delivery.

## Runbook
See `docs/security/IR_PLAYBOOKS/ddos.md` for the incident response
procedure if an attack is detected despite these protections.
