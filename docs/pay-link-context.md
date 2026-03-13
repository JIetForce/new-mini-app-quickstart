# Pay Link Context

## Purpose

Pay Link is a Base Mini App for creating and sharing a one-time payment link for a fixed USDC amount on Base mainnet.

The product goal is simple:
- a creator generates a payment link
- the recipient address defaults to the creator's connected Base Account when available
- another user opens the link and pays through Base Pay
- one successful payment closes the link permanently

This app is intentionally narrow. It is an MVP, not a general payments platform.

## Core Product Rules

- One link = one successful payment.
- Payment asset = USDC on Base.
- Payment network behavior = mainnet only.
- `testnet: false` is required in the payment flow.
- After a successful payment, the link cannot be paid again.
- Link statuses:
  - `active`
  - `paid`
  - `expired`
  - `canceled`

## Main User Flows

### 1. Home `/`

The home page explains the product in one screen and gives two primary actions:
- create a new payment link
- open the creator's own links list

### 2. Create `/create`

The creator enters:
- amount in USDC
- optional title
- optional note
- optional expiration datetime

Default recipient behavior:
- if a connected Base Account address is available in the Mini App environment, it is used automatically as the recipient address
- manual recipient editing is available as a fallback/override

Ownership behavior:
- creating a link requires a verified wallet session
- `creator_address` is derived from that server-verified wallet session
- client-supplied creator ownership data is ignored in secure flows

Creator profile metadata captured on create when available:
- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`

Important:
- creator metadata is display-only
- it is not trusted auth
- missing creator metadata must never block link creation
- Farcaster Mini App context is never used for secure ownership decisions

### 3. Payment Link `/r/[slug]`

The payment page shows:
- title
- note
- amount
- status
- creator identity
- recipient address
- payer address after successful payment

If the link is `active`, the payer can start a real Base Pay payment.

Payment flow:
1. call `pay()`
2. call `getPaymentStatus()`
3. persist the result through the confirm API
4. if completed, mark the link as paid and store payment metadata

### 4. My Links `/my-links`

This page lists links owned by the current signed-in wallet session.

Current lookup rule:
- links are fetched by the owner wallet address from the verified server session
- the browser does not send an owner address for authorization

The page supports:
- pagination
- status filtering
- open link action
- copy link action

## Identity Rules

### Creator Identity

Display priority:
1. `creator_display_name`
2. `creator_username`
3. shortened `creator_address`

Avatar:
- use `creator_pfp_url` when available
- otherwise show a simple fallback avatar/initial

### Recipient Identity

Current rule:
- only `recipient_address` is trusted and stored as recipient identity
- recipient address is shown in full
- no username/display name should be invented without a real source

### Payer Identity

Current rule:
- only `payer_address` is stored and shown after a successful payment
- payer name/profile is not currently part of the trusted flow

## Data Model

### `payment_links`

Important fields used by the app:
- `id`
- `slug`
- `creator_address`
- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`
- `recipient_address`
- `amount_usdc`
- `title`
- `note`
- `status`
- `payment_id`
- `payer_address`
- `expires_at`
- `paid_at`
- `created_at`

### `payment_attempts`

Important fields:
- `id`
- `payment_link_id`
- `payment_id`
- `status`
- `created_at`
- `updated_at`

## Server/API Behavior

### `POST /api/links`

Creates a link.

Required business validation:
- `amount > 0`
- `recipient_address` must exist and be valid
- wallet session must be present and valid

Ownership rule:
- `creator_address` is taken from the verified wallet session only
- any client-supplied `creatorAddress` must be ignored

Optional metadata that must never block creation:
- `creator_fid`
- `creator_username`
- `creator_display_name`
- `creator_pfp_url`

`creator_fid` normalization rule:
- positive integer => keep
- anything else => `null`

### `GET /api/links/[slug]`

Fetches one link by slug.

If a link is expired and still marked `active`, the API should update it to `expired`.

### `POST /api/links/[slug]/confirm`

Persists payment result.

Input:
- `paymentId` only

Responsibilities:
- write/update a `payment_attempts` row
- verify Base Pay status server-side using the payment ID only
- never trust client-supplied status, payer, recipient, or amount
- compare verified recipient against stored `recipient_address`
- compare verified amount against stored `amount_usdc`
- derive `payer_address` from the verified payment status response only
- update the matching payment link only after verification succeeds
- save `payment_id`
- save `payer_address`
- set `paid_at` when completed
- prevent duplicate successful payments for the same link

### `GET /api/my-links`

Loads owner-only link history.

Authorization rule:
- owner wallet address is derived from the verified server session
- no client-supplied owner address is trusted

## Technical/Environment Notes

- This app is designed for the Base Mini App environment.
- Base Account autofill must be tested through Base Preview or Base App using a public `https` URL.
- Normal localhost browser sessions may not expose the same Mini App wallet/provider context.
- Supabase keys that require privileged access must stay server-side only.
- Creator metadata from Mini App context is useful for display, not for trusted authorization.
- RLS is enabled on `wallet_auth_nonces`, `payment_links`, and `payment_attempts` as defense in depth.
- Public direct table access from the browser is intentionally not used in this MVP.
- Quick Auth remains outside all secure ownership and payment confirmation flows.

## Current MVP Scope

Included:
- fixed-amount one-time USDC payment links
- real Supabase persistence
- real Base Pay flow
- wallet-session-based owner authorization
- creator metadata for display
- payer address after successful payment
- my links list with pagination and status filter

Explicitly not included:
- split payments
- subscriptions
- escrow
- analytics dashboards
- recipient profile resolution
- trusted Farcaster identity/auth enforcement

## Maintenance Rule

When changing the product flow or business behavior:
- update the code
- update this file in the same task

This document should stay accurate enough that a developer or product owner can read only this file and understand:
- what the app does
- why it exists
- how the flows work
- what constraints the MVP currently has
