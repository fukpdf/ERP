# Web Application Firewall (WAF)

## Configuration
- Managed rule sets first: AWS Managed Rules (Common Rule Set + SQLi
  Rule Set) or Cloudflare's Managed Ruleset — these cover the bulk of
  known attack patterns and are maintained by the vendor.
- Custom rules on top for application-specific gaps — see
  `infra/security-hardening/waf/custom-rules.yaml` for the rationale
  (webhook signature pre-filtering, oversized body rejection, geo
  restriction on admin paths if configured).

## Rollout recommendation
Deploy new custom rules in **log/count mode first**, for at least a
week, before switching to **block mode** — WAF false positives that
block real customer traffic are a common and costly launch mistake.
This wasn't automated in this delivery (no live WAF to stage rules
against); it's a process recommendation for whoever operates this.

## Status
Rule definitions are real and valid for both Cloudflare and AWS WAF.
Not applied to live infrastructure. See DDOS_PROTECTION.md and
BOT_PROTECTION.md for the adjacent edge-security controls.
