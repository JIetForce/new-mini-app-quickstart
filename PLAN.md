# Pay Link Hardening Plan

## Goal

Harden the Pay Link MVP so ownership-sensitive behavior is wallet-authenticated, payment confirmation is server-authoritative, and the database enforces the one-link-one-success rule.

## Security Direction

- Secure ownership uses a verified wallet session only.
- Do not use Mini App context, FID, Quick Auth, username, or display name for auth or authorization.
- Creator profile metadata remains display-only and optional.
- Public payment links remain publicly viewable through Next.js server routes, not direct browser Supabase access.

## Auth Plan

- Add a minimal SIWE session flow backed by:
  - server-issued one-time nonces
  - full SIWE message parsing and validation on the server
  - signature verification with `viem` SIWE helpers on Base mainnet
  - an `httpOnly` signed session cookie
- Server verification must validate:
  - address binding
  - nonce binding
  - domain binding
  - Base mainnet chain binding (`8453` / `0x2105`)
  - issued-at / expiration / not-before checks when present
- Use:
  - `parseSiweMessage`
  - `validateSiweMessage`
  - `publicClient.verifySiweMessage(...)`
- Keep client-side signing fallback only for wallets that do not support `wallet_connect` + `signInWithEthereum`.

## Ownership Rules

- `POST /api/links` derives `creator_address` from the verified wallet session only.
- `GET /api/my-links` derives the owner from the verified wallet session only.
- Any client-supplied `creatorAddress` is ignored in secure flows.

## Payment Rules

- Keep public payment UX client-side with official Base Pay.
- `POST /api/links/[slug]/confirm` accepts only `{ paymentId }`.
- The server independently calls Base Pay `getPaymentStatus({ id, testnet: false })`.
- The server verifies:
  - recipient matches `recipient_address`
  - amount matches `amount_usdc`
  - payer address comes only from the verified payment status response
- Only verified success can mark a link `paid`.

## Database Hardening

- Add `wallet_auth_nonces` for server-issued nonces.
- Enable RLS on:
  - `wallet_auth_nonces`
  - `payment_links`
  - `payment_attempts`
- Keep RLS closed by default. No public browser access policies are added in this hardening pass.
- Add DB-level uniqueness and transactional finalize behavior so:
  - one link cannot have multiple successful payments
  - one payment ID cannot be reused across successful links
  - repeated confirms are idempotent where possible
  - concurrent confirms cannot create double-success states

## Farcaster SDK Boundary

- Farcaster Mini App SDK remains only for Mini App lifecycle and optional display metadata capture.
- Quick Auth remains outside all secure ownership and payment-confirm paths.
- Removing any remaining unused Farcaster SDK code is follow-up cleanup, not part of the secure path design.
