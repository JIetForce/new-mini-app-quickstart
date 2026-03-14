# Pay Link Context

This file is the quick project context for humans and future agents.

## One-Paragraph Summary

Pay Link is a Base Mini App that lets a user create a fixed-amount, one-time USDC payment link on Base mainnet, share it, and close it permanently after the first verified successful payment. In the current product, the owner wallet and receiving wallet are the same address in the UI, while secure ownership is enforced server-side through a SIWE-backed wallet session.

## Read These Files First

- [project-overview.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/project-overview.md)
  - product scope, routes, trust boundaries, env, and why the app behaves this way
- [current-flows.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/current-flows.md)
  - exact browser/server/database behavior for the main flows
- [technical-architecture.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/technical-architecture.md)
  - file map, stack, RLS, RPCs, and technical debt
- [references.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/references.md)
  - curated official docs for future maintenance

## Current Product Rules

- one link = one successful payment
- payment asset = USDC on Base
- payment flow is mainnet only
- `testnet: false` is required for Base Pay
- creator metadata is display-only
- owner-only routes derive authority from the verified wallet session
- public payment links remain publicly viewable
- payment completion is server-authoritative
- Basename resolution and creator profile metadata are display-only
- paid links may show a BaseScan transaction link when the stored `payment_id` is a real tx hash

## Current Critical Boundaries

Trusted:
- `recipient_address`
- `amount_usdc`
- `payment_id`
- verified payment status
- `payer_address` only after server verification
- owner wallet address from the `pay_link_session` cookie

Not trusted for ownership or payment security:
- Mini App context identity
- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`
- any client-reported payment outcome

## Maintenance Rule

If any of the following change, update the relevant docs in the same task:
- routes
- UI copy that changes product meaning
- auth/session behavior
- payment confirmation behavior
- DB schema or migrations
- environment variables
- trust boundaries
- Base App specific behavior

`PLAN.md` is historical context only. The current source of truth is the documentation set above plus the current codebase.
