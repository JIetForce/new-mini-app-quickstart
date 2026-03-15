# Pay Link Technical Architecture

## Runtime and Framework

- Framework: Next.js 15 App Router
- React: React 19
- Language: TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui primitives + semantic token CSS
- Rendering mix:
  - server components for initial public link loading
  - client components for wallet/session UX and Base Pay interactions
- API surface: Next.js route handlers under `app/api`
- discovery/share surface: Next.js metadata + `/.well-known/farcaster.json`

## Frontend Stack

- `wagmi`
  - wallet state
  - wallet connection
  - message signing
- `viem`
  - SIWE message creation and verification helpers
  - Base mainnet public client
  - reverse name resolution for Basename/ENS-style display labels
- `@tanstack/react-query`
  - required by wagmi provider setup
- `@farcaster/miniapp-sdk`
  - Mini App readiness
  - access to Mini App context for display metadata and safe-area data
- `@farcaster/miniapp-wagmi-connector`
  - embedded Mini App wallet connector
- wagmi connectors in current use
  - `baseAccount()` when the Base Account / smart-wallet path is available
  - `injected()` as the standard EIP-1193 fallback for normal browsers and embedded contexts where `wallet_connect` is unsupported
  - `farcasterMiniApp()` remains available for Mini App environments, but the app no longer depends on it as the only embedded connect path
- `@base-org/account`
  - Base Pay `pay()`
  - Base Pay `getPaymentStatus()`
- `shadcn` / `class-variance-authority` / `tailwind-merge`
  - UI component foundation

## Backend / Server Stack

- Next.js route handlers for all server operations
- Supabase REST API accessed through a server-only helper
- no browser Supabase client
- signed `httpOnly` cookie session for wallet ownership
- signed `httpOnly` pre-auth cookie for SIWE challenge binding
- server-side SIWE verification
- lightweight in-memory route limiter for expensive public endpoints

## Major Directories

- `app/`
  - pages, route handlers, providers, and small UI helpers
  - route-level metadata for indexable vs `noindex` surfaces
- `app/api/`
  - auth routes
  - link CRUD/read routes
  - payment confirm route
- `app/providers.tsx`
  - main wagmi/query/mini-app provider wiring used by the app
- `app/providers/MiniAppProvider.tsx`
  - wraps Farcaster Mini App SDK context and `ready()` handling
- `lib/auth/`
  - SIWE/session types
  - server verification and cookie helpers
  - browser wallet-session hook
- `lib/identity/`
  - display-only address formatting
  - tx-hash/BaseScan helpers
  - server-side Basename resolution
  - browser hook for cached name lookups
- `lib/payment-links/`
  - payment-link parsing, normalization, public mapping
  - shared status constants and expiration preset options
  - server-side link and payment services
- `lib/supabase/server.ts`
  - server-only Supabase REST wrapper
- `supabase/migrations/`
  - additive SQL migrations for creator metadata, payer address, auth hardening, RLS, and RPCs
- `styles/`
  - Tailwind entrypoint and design tokens
- `public/distribution/`
  - manifest/discovery assets referenced by `farcaster.config.ts`
- `docs/`
  - project, flow, architecture, and maintenance docs

## Where the Important Logic Lives

### Mini App shell and provider setup

- [app/providers.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/providers.tsx)
- [app/providers/MiniAppProvider.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/providers/MiniAppProvider.tsx)
- [app/components/SafeArea.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/components/SafeArea.tsx)

### Auth and wallet-session logic

- [lib/auth/shared.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/auth/shared.ts)
- [lib/auth/server.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/auth/server.ts)
- [lib/auth/useWalletSession.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/auth/useWalletSession.ts)
- [app/api/auth/nonce/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/auth/nonce/route.ts)
- [app/api/auth/session/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/auth/session/route.ts)
- [app/api/auth/verify/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/auth/verify/route.ts)

### Payment-link logic

- [lib/payment-links/shared.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/payment-links/shared.ts)
- [lib/payment-links/server.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/payment-links/server.ts)
- [app/api/links/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/links/route.ts)
- [app/api/links/[slug]/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/links/[slug]/route.ts)
- [app/api/links/[slug]/confirm/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/links/[slug]/confirm/route.ts)
- [app/api/my-links/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/my-links/route.ts)

### Display identity and tx helpers

- [lib/identity/display.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/identity/display.ts)
- [lib/identity/server.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/identity/server.ts)
- [lib/identity/useResolvedNames.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/identity/useResolvedNames.ts)
- [app/api/identity/resolve/route.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/api/identity/resolve/route.ts)

### UI entry points

- [app/page.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/page.tsx)
- [app/create/page.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/create/page.tsx)
- [app/my-links/page.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/my-links/page.tsx)
- [app/r/[slug]/page.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/r/[slug]/page.tsx)
- [app/r/[slug]/PaymentLinkClient.tsx](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/app/r/[slug]/PaymentLinkClient.tsx)

## Request / Response Topology

### Wallet session

Browser:
- `useWalletSession()` preloads `/api/auth/session` and `/api/auth/nonce`
- on confirmation, it builds a SIWE message and signs it with wagmi `useSignMessage`
- if connector-based connect or sign hits `wallet_connect` unsupported errors, the hook falls back to the standard browser-provider path

Server:
- `/api/auth/nonce` issues a nonce and refreshes a signed pre-auth browser-state cookie
- `/api/auth/verify` parses and validates the SIWE message
- `lib/auth/server.ts` verifies the signature and consumes the nonce
- the route sets the signed cookie session

Database:
- `wallet_auth_nonces` stores issued nonces plus a hash of the pre-auth browser state
- RPC `consume_wallet_auth_nonce(text, text)` invalidates the nonce once only when both nonce and state hash match

### Create link

Browser:
- `/create` sends link fields, an expiration preset, and optional creator display metadata

Server:
- `/api/links` requires a wallet session
- it derives the owner wallet from `session.address`
- `lib/payment-links/server.ts` validates business fields and inserts the link
- the server stores `recipient_address = creator_address` so the internal payment-verification field matches the owner wallet

Database:
- `payment_links` row is created with `status = 'active'`

### Owner link history

Browser:
- `/my-links` sends only pagination and status filter
- it may also resolve display-only Basenames through `/api/identity/resolve`

Server:
- `/api/my-links` derives the owner from the session cookie
- `getCreatorPaymentLinks()` queries `payment_links`

Database:
- `payment_links` rows are read by creator address
- expired active rows may be updated to `expired` during read

### Public payment link

Browser:
- `/r/[slug]` client component can refresh the link and trigger Base Pay
- it derives owner-view vs payer-view vs generic paid view from:
  - connected wallet address
  - verified session wallet
  - verified stored `payer_address`
- it can render a BaseScan transaction link only when `payment_id` passes the tx-hash guard

Server:
- server component and `/api/links/[slug]` both load the link through server-only code
- expired rows are normalized during read

Database:
- `payment_links` is the canonical source of public link state

### Payment confirmation

Browser:
- `pay()` returns a `paymentId`
- the client may call `getPaymentStatus()` for immediate UX
- the client sends only `paymentId` to `/api/links/[slug]/confirm`

Server:
- `confirmPaymentLink()` re-validates the payment through `getPaymentStatus()`
- it never trusts client-reported payment outcome or payer info
- it compares verified recipient and amount to the stored link

Database:
- `payment_attempts` stores the observed payment state
- RPC `finalize_payment_link_success(...)` finalizes a successful payment transactionally

## Supabase Usage

Current model:
- only server code talks to Supabase
- the project uses the REST API directly instead of `@supabase/supabase-js`
- all requests go through [lib/supabase/server.ts](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/lib/supabase/server.ts)

Key implications:
- `SUPABASE_SECRET_KEY` must remain server-side only
- browser code never queries `payment_links` or `payment_attempts` directly
- public reads are intentionally routed through Next.js code instead of direct table exposure
- display-only Basename resolution does not use Supabase

## Display Identity Resolution

Current implementation:
- creator and payer names are resolved through a Next.js server route, not directly from the browser
- the server uses `viem` reverse resolution
- results are cached lightly in the browser for the current session

Priority rules:
- creator: Basename -> stored display name -> stored username -> shortened address
- payer: Basename -> shortened address
- receiving wallet: full stored address only

Trust boundary:
- all resolved names are display-only
- no resolved name or stored display metadata is used for auth, authorization, ownership, or payment validation
- the current product UI treats creator and receiving wallet as the same actor, even though the DB still keeps `recipient_address` as the internal payment-verification field

## Transaction Links

Current implementation:
- `payment_id` is normalized as a 32-byte `0x...` hash before it becomes public link data
- UI components build `https://basescan.org/tx/${paymentId}` only when the hash guard passes
- if a future payment provider or SDK path ever returns a non-tx identifier, the UI will fall back to showing the raw `payment_id` instead of building a broken link

## Session Cookie Behavior

Current cookie:
- name: `pay_link_session`
- type: signed payload, not an opaque DB-backed session id
- flags:
  - `httpOnly`
  - `sameSite=lax`
  - `secure` in production
  - 7-day TTL

The cookie payload contains:
- normalized wallet address
- `issuedAt`
- `expiresAt`

Pre-auth cookie:
- name: `pay_link_pre_auth`
- type: signed payload containing a random browser-state token
- flags:
  - `httpOnly`
  - `sameSite=lax`
  - `secure` in production
  - 10-minute TTL
- purpose:
  - binds a fetched SIWE nonce to the same browser that requested it
  - prevents redeeming a valid nonce/signature from a different browser state

## Canonical Auth Origin Policy

Current behavior:
- SIWE verification no longer trusts arbitrary request host or forwarded-proto headers
- the canonical auth origin is derived from `NEXT_PUBLIC_URL` / `getAppUrl()`
- additional auth origins are accepted only when explicitly listed in `PAY_LINK_ALLOWED_AUTH_ORIGINS`

Operational note:
- local preview or alternate deploy domains must be added explicitly if they need to support SIWE auth

## Route-Level Abuse Controls

Current implementation:
- `lib/security/rate-limit.ts` provides a best-effort in-memory limiter keyed by route + client IP
- the limiter is currently applied to:
  - `/api/auth/nonce`
  - `/api/links/[slug]/confirm`
  - `/api/identity/resolve`

Important limitation:
- this limiter is per-process and is not a durable distributed rate-limit solution
- production still needs edge/CDN/platform throttling for strong abuse resistance

## Security Headers and CSP

Current implementation:
- `next.config.ts` now sets a repo-visible baseline header policy
- included headers:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy`
- the CSP `frame-ancestors` directive is now explicit and env-driven

Current `frame-ancestors` policy:
- production default: `'self'`
- local development default: `'self' http://localhost:* http://127.0.0.1:* https://localhost:* https://127.0.0.1:*`
- external embedding origins are accepted only when explicitly listed in `PAY_LINK_ALLOWED_FRAME_ANCESTORS`
- `PAY_LINK_ALLOWED_FRAME_ANCESTORS` accepts a comma-separated or space-separated list
- only sanitized `http(s)://host[:port]` or `http(s)://*.host[:port]` sources are accepted; malformed entries are ignored

Operational note:
- production Base/Farcaster embedding now requires setting `PAY_LINK_ALLOWED_FRAME_ANCESTORS` to the exact trusted embed origins for the deployment
- the repo intentionally does not guess those production origins

## Manifest and Discovery Wiring

Current distribution-facing implementation:
- [`farcaster.config.ts`](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/farcaster.config.ts) is the source of truth for the Mini App manifest
- `app/.well-known/farcaster.json/route.ts` serves that manifest directly
- `lib/env.ts` provides the canonical app URL used by both app metadata and manifest URLs
- `/` is the intended discovery/share entry page
- `/create`, `/my-links`, and `/r/[slug]` set `robots: noindex`
- `public/distribution/` is expected to contain current live-product captures/assets rather than stale design placeholders
- paid and created timestamps are rendered in a deterministic UTC format to avoid SSR/client hydration mismatches

Current manifest details:
- `canonicalDomain` is derived from the canonical app URL host
- `requiredChains` is pinned to Base mainnet
- `requiredCapabilities` lists only capabilities currently used by the app shell
- `baseBuilder.ownerAddress` is optional and env-driven
- `webhookUrl` is intentionally omitted because the repo has no webhook route or notification flow
- `iconUrl` points to a 1024x1024 PNG
- `splashImageUrl` points to a lightweight 200x200 PNG
- `screenshotUrls` point to portrait 1284x2778 live-product captures

Current page metadata details:
- root layout publishes canonical Open Graph / Twitter metadata
- home page publishes Mini App launch metadata
- the app keeps `base:app_id` in metadata

## RLS and RPC Behavior

Current RLS posture:
- enabled on `wallet_auth_nonces`
- enabled on `payment_links`
- enabled on `payment_attempts`

Current intention:
- defense in depth for all public-schema tables used by the app
- no broad browser-facing policies
- server-side secret-key path remains the operational access path

Current RPCs:
- `consume_wallet_auth_nonce(text, text)`
  - one-time nonce invalidation bound to `nonce + state_hash`
- `finalize_payment_link_success(text, text, text, timestamptz)`
  - transactional successful-payment finalization

## Migration Model

The repo uses additive SQL migrations:
- [20260309_add_payment_link_creator_metadata.sql](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/supabase/migrations/20260309_add_payment_link_creator_metadata.sql)
- [20260309_add_payment_link_payer_address.sql](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/supabase/migrations/20260309_add_payment_link_payer_address.sql)
- [20260313_harden_auth_and_payments.sql](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/supabase/migrations/20260313_harden_auth_and_payments.sql)
- [20260315_bind_wallet_auth_nonce_state.sql](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/supabase/migrations/20260315_bind_wallet_auth_nonce_state.sql)

The base table creation for `payment_links` and `payment_attempts` is assumed to exist already in the live project.

## Important Security Behavior

- owner-sensitive routes use verified wallet session only
- Mini App context data is display-only
- client-supplied `creatorAddress` is overwritten server-side
- client-supplied payer, recipient, amount, or payment status are not trusted
- server verifies Base Pay status before marking a link paid

## Current Limitations and Technical Debt

- the app does not use `@farcaster/quick-auth` in the secure auth path and no longer carries it as a direct root dependency
- `canceled` exists in the status model, but there is no implemented cancel action
- there is no explicit logout route yet
- the project still relies on production DB state for the original base tables because the repo only contains additive migrations for later changes
- Basename resolution is best-effort display-only behavior; if no name resolves or RPC access is unavailable, the UI falls back to stored metadata or addresses
- manifest publishing still depends on an externally valid production domain and matching account association; the repo cannot prove that by itself
