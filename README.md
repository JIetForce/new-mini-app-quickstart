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

## Validation Commands

```bash
npm run build
npx tsc --noEmit
```

## Notes

- Mini App wallet behavior must be tested in Base Preview or the Base App with a public `https` URL.
- The browser does not access Supabase tables directly in the current implementation.
- Owner-only actions rely on a SIWE-backed wallet session, not on Mini App profile metadata.
