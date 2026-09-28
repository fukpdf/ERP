# Playbook: DDoS

## Trigger
Sustained traffic spike causing degraded latency/availability, or an
explicit alert from Cloudflare/AWS Shield.

## Immediate actions
1. Confirm it's actually an attack, not a legitimate traffic spike
   (marketing launch, viral event) — check traffic source diversity
   and request patterns before assuming malice.
2. If confirmed: enable "Under Attack Mode" (Cloudflare) or escalate
   to AWS Shield Advanced DRT (Shield Response Team) if on that tier.
3. Tighten WAF rate-limit rules temporarily (see
   `infra/security-hardening/waf/`) — accept some false-positive risk
   during active mitigation.
4. Scale up if the platform can absorb legitimate traffic alongside
   attack traffic and cost allows it as a stopgap — but don't treat
   autoscaling alone as a DDoS defense (a large enough attack outpaces
   any autoscaling budget).

## Communication
Status page update if customer-visible impact exceeds the SLA
threshold in `docs/launch/SLA_DEFINITIONS.md`.

## Post-incident
Review whether the attack indicates a specific target (e.g., one
expensive endpoint) that needs its own tighter rate limit going
forward, distinct from the general edge protection.
