# Zero Trust Architecture

## Principles applied
1. **No implicit trust from network location** — control plane ↔
   customer environment communication uses mTLS + signed requests
   (M14 Istio), not "it's inside our VPC so it's trusted."
2. **Least privilege by default** — Vault policies
   (`infra/security-hardening/vault/policies/`) grant only the
   specific paths each service needs; break-glass admin access is
   separate, time-boxed, and MFA-gated.
3. **Verify explicitly, every request** — session validation
   (`SessionManager.validate()`) checks idle/absolute timeout on every
   request, not just at login; CSRF/origin checks apply per-request,
   not per-session.
4. **Assume breach** — anomaly detection
   (impossible-travel/unusual-time/brute-force) exists specifically
   because perimeter controls are assumed to eventually be
   circumvented; the goal is fast detection, not just prevention.

## Network segmentation (M14's implementation, referenced here)
- Control plane has no direct internet exposure for internal-only
  services, per the amendment.
- Network policies deny customer-environment → control-plane traffic
  except via the defined orchestration API.

## Status
This document describes the intended architecture and cites where
each principle is implemented vs. where it depends on M14's network
policies (not re-verified in this isolated module). It is not itself
a new control — it's the organizing framework the other docs in this
folder implement pieces of.
