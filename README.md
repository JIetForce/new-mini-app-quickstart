# Pay Link

Pay Link is a Base Mini App for creating and sharing a one-time payment link for a fixed USDC amount on Base mainnet.

## What It Does

- creates a fixed-amount payment link
- defaults the recipient to the connected wallet when available
- lets another user pay through Base Pay
- closes the link after the first verified successful payment
- shows the creator’s own links in an owner-scoped history page

## Current Docs

- [Project overview](./docs/project-overview.md)
- [Technical architecture](./docs/technical-architecture.md)
- [Current flows](./docs/current-flows.md)
- [Official references](./docs/references.md)
- [Quick context](./docs/pay-link-context.md)

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `PAY_LINK_SESSION_SECRET`

Recommended in deployed environments:

- `NEXT_PUBLIC_URL`
- `NEXT_PUBLIC_BASE_BUILDER_CODE` (optional, defaults to the app's current Builder Code)
- `PAY_LINK_ALLOWED_AUTH_ORIGINS` (optional comma-separated allowlist for extra auth origins such as preview/dev URLs)
- `PAY_LINK_ALLOWED_FRAME_ANCESTORS` (optional space- or comma-separated allowlist for external embed origins)
- `BASE_BUILDER_OWNER_ADDRESS` (optional, only for manifest builder linkage)

## Validation Commands

```bash
npm run build
npx tsc --noEmit
```

## Notes

- Mini App wallet behavior must be tested in Base Preview or the Base App with a public `https` URL.
- The browser does not access Supabase tables directly in the current implementation.
- Owner-only actions rely on a SIWE-backed wallet session, not on Mini App profile metadata.
- `/api/auth/nonce` now binds the SIWE nonce to a short-lived signed `httpOnly` pre-auth cookie so the challenge must be redeemed from the same browser that requested it.
- SIWE origin validation is strict by default against the canonical app URL and can be extended only through `PAY_LINK_ALLOWED_AUTH_ORIGINS`.
- Public high-cost routes have repo-level best-effort rate limits, but production still needs edge/CDN/platform throttling for durable abuse protection.
- Repo-visible security headers are defined in `next.config.ts`, including `frame-ancestors`.
- `frame-ancestors` defaults to `'self'` in production and to `'self'` plus localhost dev origins in local development.
- If the app must launch inside Base/Farcaster embeds in production, set `PAY_LINK_ALLOWED_FRAME_ANCESTORS` to the exact trusted embedding origins required by those surfaces.
- Distribution metadata and manifest assets live in `farcaster.config.ts` and `public/distribution/`.
- The public payment flow appends ERC-8021 Builder Code attribution to its `wallet_sendCalls` request through a small local helper in `lib/payments/`.
- `public/distribution/` should contain current live-product assets, not stale design exports.
- `NEXT_PUBLIC_URL` should point to the final production HTTPS domain before publishing.
- If the production domain changes, regenerate `accountAssociation` for that exact domain.
- The manifest intentionally omits `webhookUrl` because the repo does not implement notifications.
