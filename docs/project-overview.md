# Pay Link Project Overview

## What This App Is

Pay Link is a Base Mini App for creating and sharing a one-time payment link for a fixed USDC amount on Base mainnet.

The app is intentionally narrow:
- one link represents one fixed USDC payment request
- one successful payment closes the link permanently
- the creator can later review their own links from an owner-scoped history page

This is an MVP for a single payment-link use case, not a general payments platform.

## Problem It Solves

The app gives a Base App user a simple way to:
- generate a shareable USDC payment request without building a checkout flow
- receive payment to their Base wallet address by default
- let another user complete payment with Base Pay
- track whether the request is still open, already paid, or expired

The product avoids more complex features so the core payment path stays understandable and hard to misuse.

## Current MVP Scope

Included today:
- Base App / Base Mini App embedded usage
- fixed-amount one-time USDC links on Base mainnet
- home page configured as the app's canonical discovery/share surface
- owner wallet and receiving wallet are the same address in the current product
- server-verified wallet session for owner-only flows
- creator display metadata captured from Mini App context when available
- display-only Basename reverse resolution for creator/payer labels when available
- public payment page with Base Pay
- server-authoritative payment confirmation
- owner-scoped `/my-links` history with pagination and status filtering
- payer address display after successful payment
- BaseScan transaction links for paid links when `payment_id` is a real tx hash

Intentionally not supported yet:
- split payments
- group contributions
- subscriptions or recurring billing
- escrow
- analytics or dashboards
- receiving-wallet profile resolution beyond address / Basename fallback
- trusted Farcaster identity for auth or authorization
- edit/delete/cancel flows for links
- a user-facing logout flow

Schema note:
- `canceled` exists as a status value in the model and UI badges, but there is currently no route or UI that sets a link to `canceled`.

## Why It Works This Way

The app separates convenience from authority:
- wallet address auto-fill is a UX optimization
- secure ownership still comes from a verified server-side SIWE session
- Base Pay status is checked client-side for immediate UX, but the server is the final authority for marking a link as paid
- owner profile data from Mini App context is helpful for display, but it is not trusted for ownership or access control

This design keeps the public payment link simple while protecting owner-only operations such as creating links and loading `/my-links`.

## User Journey

### 1. Home `/`

The landing page explains the app in one screen and offers two actions:
- create a payment link
- open the current wallet owner’s links page

### 2. Create `/create`

The creator can enter:
- amount in USDC
- optional title
- optional note
- optional expiration preset

Supported expiration presets:
- 1 hour
- 12 hours
- 1 day
- 7 days
- 30 days
- Never

Current wallet behavior:
- the receiving wallet is always the owner wallet for this product
- the form shows that wallet as read-only display data
- the server stores the same verified wallet as both `creator_address` and `recipient_address`

Current ownership behavior:
- the page separately checks for a verified wallet session
- if the connected wallet and verified session do not match, creation is blocked until ownership is re-confirmed
- when the form is submitted, the server derives `creator_address` from the verified wallet session, not from client input

Current creator metadata capture:
- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`

Those fields come from Mini App context if available and are stored only for display.

### 3. My Links `/my-links`

This page is owner-scoped:
- it requires a valid wallet session
- it loads links for the session wallet only
- the browser does not send a trusted owner address

The page shows:
- amount
- status
- wallet address for the link owner / receiver
- created timestamp
- paid timestamp if present
- absolute timestamps rendered in UTC for consistent output
- open-link action
- copy-link action
- transaction link when the stored `payment_id` is a renderable Base tx hash

It currently supports:
- pagination
- status filtering

### 4. Public Payment Link `/r/[slug]`

This is a public page. It does not require a session to view or pay.

It shows:
- title
- note
- owner display block
- amount
- status
- receiving wallet address
- expiration
- payer address after successful payment
- transaction link after successful payment when `payment_id` is a tx hash
- share URL copy

If the link is still active, the payer can launch Base Pay.

If the link is already paid, the UI now adapts the receipt state:
- payer view
  - when the connected wallet matches the verified `payer_address`
- owner receipt view
  - when the connected wallet or verified session wallet matches `creator_address`
- generic public paid view
  - for other viewers

## Current Pages and Routes

### App Pages

- `/`
  - marketing/summary page for the MVP
  - canonical discovery/share surface for distribution
- `/create`
  - owner action for link creation
  - marked `noindex`
- `/my-links`
  - owner-scoped history page
  - marked `noindex`
- `/r/[slug]`
  - public payment page
  - marked `noindex`

### Manifest Route

- `/.well-known/farcaster.json`
  - serves the current Mini App manifest from [`farcaster.config.ts`](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/farcaster.config.ts)
  - uses the canonical app URL as the source for manifest URLs

## Current Distribution and Discovery Metadata

The repo now includes a distribution-focused metadata surface:
- `/` is the intended share/discovery entry page
- `app/layout.tsx` publishes canonical Open Graph and Twitter metadata
- `app/page.tsx` publishes Mini App launch metadata
- `public/distribution/` contains dedicated manifest/discovery assets
- portrait screenshots are current live-product captures sized for distribution surfaces

Current manifest behavior:
- `canonicalDomain` is derived from the canonical app URL host
- `requiredChains` is pinned to Base mainnet
- `baseBuilder.ownerAddress` is included only when `BASE_BUILDER_OWNER_ADDRESS` is set
- `webhookUrl` is intentionally omitted because the repo does not implement webhook notifications
- account association remains environment-specific and must match the real production domain

### Auth API Routes

- `GET /api/auth/session`
  - reads the current wallet session cookie
- `GET /api/auth/nonce`
  - creates and stores a one-time SIWE nonce
  - refreshes a signed pre-auth cookie that binds the challenge to the requesting browser state
- `POST /api/auth/verify`
  - verifies the signed SIWE message, requires the matching pre-auth cookie, and sets the wallet session cookie

### Payment Link API Routes

- `POST /api/links`
  - creates a new payment link
  - requires a verified wallet session
- `GET /api/links/[slug]`
  - loads a public payment link
  - also syncs `active -> expired` if needed
- `POST /api/links/[slug]/confirm`
  - validates a payment by `paymentId`
  - does not trust client-supplied payment status data
- `GET /api/my-links`
  - loads the current owner’s links
  - derives the owner from the session cookie

## Current Auth and Session Model

The app uses a custom SIWE-based session model.

Browser-side flow:
1. prefetch `/api/auth/session` and `/api/auth/nonce`
2. read the connected wallet address from wagmi `useAccount()`
3. create a SIWE message for that address
4. sign it with wagmi `useSignMessage()`
5. send `{ address, message, signature }` to `/api/auth/verify`

Server-side flow:
1. parse the SIWE message
2. validate address/domain/nonce/chain/time fields against the canonical allowed auth origins
3. require the matching signed pre-auth cookie from the same browser that requested the nonce
3. verify the signature with a Base mainnet public client
4. consume the nonce once only when both `nonce` and `state_hash` match
5. clear the pre-auth cookie
6. set an `httpOnly` signed cookie named `pay_link_session`

Important auth constraints:
- Mini App context is not used as an auth credential
- FID, username, and display name are not used for ownership checks
- the session cookie is the authority for owner-only routes
- the nonce cannot be redeemed from a different browser state than the one that originally requested it
- SIWE origin validation is strict by default against the canonical app URL and any explicit allowlist entries

## Current Display Identity Strategy

Owner display priority:
1. reverse-resolved Basename from `creator_address` when available
2. stored `creator_display_name`
3. stored `creator_username`
4. shortened creator address

Payer display priority:
1. reverse-resolved Basename from verified `payer_address` when available
2. shortened payer address

Receiving wallet display:
- the receiving wallet is the same underlying address as the link owner in the current product
- the app shows the stored wallet address directly

All resolved names remain display-only. They are never used for auth, authorization, ownership checks, or payment validation.

## Current Wallet Ownership Confirmation Flow

Owner confirmation is separate from wallet display:
- the connected wallet address is used for embedded-wallet UX
- the verified wallet session is what authorizes `POST /api/links` and `GET /api/my-links`

If the connected wallet and session wallet diverge, the UI prompts the user to confirm ownership again before taking owner-only actions.

## Current Payment Flow

Client payment initiation:
- the public link page calls `pay({ amount, to, testnet: false })` from `@base-org/account`
- the page then calls `getPaymentStatus({ id, testnet: false })` for immediate UX feedback

Server payment confirmation:
- the client sends only `{ paymentId }` to `POST /api/links/[slug]/confirm`
- the server re-checks Base Pay status with `getPaymentStatus`
- the server validates:
  - recipient matches the stored `recipient_address`
  - amount matches the stored `amount_usdc`
- the server derives `payer_address` from the trusted payment status response
- only then can the link move to `paid`
- when `payment_id` matches the tx-hash guard, the UI can safely render a BaseScan link using `https://basescan.org/tx/${paymentId}`

This means the client is not trusted to report:
- who paid
- who received
- how much was paid
- whether the payment actually completed

## How the Receiving Wallet Is Derived

Current behavior:
- the verified SIWE session wallet is the authority for link creation
- `/create` shows the current owner wallet as the receiving wallet
- the client does not submit an editable `recipientAddress`
- the server still stores `recipient_address` as required business data, but derives it from the verified owner wallet and keeps it equal to `creator_address`

The stored `recipient_address` remains a trusted business field because it is still checked against the verified payment status during confirm flow.

## Data Trust Boundaries

### Trusted Fields

- `recipient_address`
- `amount_usdc`
- `payment_id`
- payment status after server verification
- `payer_address` after server verification
- owner wallet address from the verified session cookie

### Display-Only Fields

- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`
- any Mini App context profile data

Display-only data must never be used for:
- auth
- authorization
- ownership checks
- `/my-links` access control
- payment validation

## Database Tables and Purpose

### `payment_links`

Stores the canonical payment request:
- slug
- creator wallet
- creator display metadata
- receiving wallet address stored internally as `recipient_address`
- amount
- title/note
- status
- payment id
- payer address
- expiration
- paid timestamp
- created timestamp

### `payment_attempts`

Stores payment-status observations and helps prevent duplicate success states:
- `pending`
- `completed`
- `failed`
- `not_found`

### `wallet_auth_nonces`

Stores one-time SIWE nonces used during session creation, plus a hash of the short-lived pre-auth browser state that requested them.

## Important Constraints

- one link = one successful payment
- the app is Base mainnet only
- Base Pay is always called with `testnet: false`
- public link reads happen through Next.js server code, not direct browser Supabase access
- owner-only data access is always session-derived

Database hardening currently includes:
- unique attempt per `(payment_link_id, payment_id)`
- only one completed attempt per link
- only one completed attempt per payment id
- unique `payment_links.payment_id` when present

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `PAY_LINK_SESSION_SECRET`

Recommended in deployed environments:
- `NEXT_PUBLIC_URL`
- `PAY_LINK_ALLOWED_AUTH_ORIGINS`
- `BASENAME_RPC_URL`
- `BASE_BUILDER_OWNER_ADDRESS` (optional)

Optional deployment fallbacks used by `getAppUrl()`:
- `VERCEL_PROJECT_PRODUCTION_URL`
- `VERCEL_URL`

Notes:
- `SUPABASE_SECRET_KEY` is used only on the server
- no browser Supabase client exists in the current app
- `PAY_LINK_ALLOWED_AUTH_ORIGINS` is an optional comma-separated allowlist of extra origins that may complete SIWE auth in addition to the canonical app URL
- `BASENAME_RPC_URL` is optional and is used only for display-only reverse name resolution reliability
- `BASE_BUILDER_OWNER_ADDRESS`, when present, is used only for optional manifest builder metadata

Security hardening note:
- repo code now includes a visible baseline CSP/security-header policy and best-effort in-app rate limits for expensive public routes
- durable protection against abuse still depends on edge/CDN/platform rate limits outside the repo

Distribution note:
- repo code can make the app technically ready for distribution, but final publishing still requires a real production HTTPS domain, matching account association for that domain, and external validation in Base/Farcaster tooling

## What Must Be Tested in Base App / Base Preview

These behaviors should be tested in Base Preview or the Base App with a public `https` URL:
- connected wallet auto-fill in `/create`
- Mini App context availability
- safe-area behavior
- wallet ownership confirmation flow
- Base Pay UX

Plain localhost browser testing is still useful for general UI and API checks, but it is not authoritative for embedded Mini App wallet behavior.

## Why the App Behaves This Way

The current implementation deliberately optimizes for:
- minimum surface area
- narrow trust boundaries
- explicit server verification for money-related state
- low-friction Base App usage

The MVP is intentionally conservative. It prefers:
- one secure flow over many partial features
- server verification over optimistic client trust
- simple link lifecycle rules over flexible but harder-to-secure payment products
