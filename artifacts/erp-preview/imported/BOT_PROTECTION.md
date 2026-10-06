# Bot Protection

Configured via Cloudflare Bot Management
(`infra/security-hardening/bot-protection/cloudflare-bot.yaml`):
- Free tier "Bot Fight Mode" as a baseline.
- "Super Bot Fight Mode" (Business+ plan) with graduated response:
  block definitely-automated traffic, managed-challenge
  likely-automated traffic, explicitly allow verified good bots
  (search engine crawlers, our own uptime monitor).

This overlaps with, but is distinct from, rate limiting
(RATE_LIMITING.md) — bot detection uses behavioral/fingerprint
signals, not just request counts, so it can catch slow, distributed
scraping that wouldn't trip a rate limit.

## Status: IaC written, not applied to a live Cloudflare zone.
