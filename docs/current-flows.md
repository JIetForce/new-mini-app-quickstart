# Pay Link Current Flows

This file documents the current runtime behavior of the app as implemented today.

## 1. Wallet Session Flow

### Purpose

Create a server-verified wallet session for owner-only actions such as creating links and loading `/my-links`.

### Browser

1. `useWalletSession()` loads on pages that need auth-aware UX.
2. It prefetches:
   - `GET /api/auth/session`
   - `GET /api/auth/nonce`
3. `GET /api/auth/nonce` sets a short-lived signed `httpOnly` pre-auth cookie.
4. If the user chooses to confirm ownership:
   - the hook reads the current wagmi wallet address from `useAccount()`
   - if no address is connected yet, it first tries the configured wagmi connectors
   - if a connector path fails because `wallet_connect` is unsupported, it falls back to the standard EIP-1193 path (`eth_requestAccounts` + normal message signing)
   - it builds a SIWE message with `createSiweMessage()`
   - it signs that message with wagmi `useSignMessage()`
   - if signing through the active connector fails because `wallet_connect` is unsupported, it falls back to `personal_sign` through the browser provider
5. The browser sends `{ address, message, signature }` to `POST /api/auth/verify`.

### Server

1. `verifyWalletSession()` parses the SIWE message.
2. It validates:
   - address
   - version
   - chain id = 8453
   - nonce
   - canonical origin / domain / scheme
   - issued-at / expiration / not-before checks
3. It requires the matching signed pre-auth cookie from the same browser that requested the nonce.
4. It verifies the signature with a Base mainnet public client.
5. It consumes the nonce with the Supabase RPC using `nonce + state_hash`.
6. It creates a signed `pay_link_session` cookie and clears the pre-auth cookie.

### Database

1. `wallet_auth_nonces` stores the generated nonce and a hash of the pre-auth browser state.
2. `consume_wallet_auth_nonce` marks it as consumed exactly once only when both `nonce` and `state_hash` match.

### Result

- Owner-only routes can now derive the wallet owner from the session cookie.
- The connected wallet address and session wallet may still diverge later, so the UI checks for mismatch.
- The same connected wallet is also used for viewer-specific paid-state detection on the public payment page.

### Common Failure Paths

- Nonce fetched in one browser and redeemed in another:
  - server returns 401 because the pre-auth cookie state does not match
- Origin/domain mismatch:
  - server returns 400 because the SIWE message origin is not in the canonical origin set or explicit allowlist
- Reused or expired nonce:
  - server returns 401 and the UI must fetch a fresh challenge
- Connector does not support `wallet_connect`:
  - the client falls back to a standard injected/EIP-1193 wallet path instead of failing auth immediately

## 2. Create-Link Flow

### Happy Path

#### Browser

1. The user opens `/create`.
2. The page shows the current owner wallet as the receiving wallet.
3. The user confirms wallet ownership to create a verified session.
4. The user submits:
   - `amountUsdc`
   - `expirationPreset`
   - optional `title`
   - optional `note`
   - optional display metadata from Mini App context
5. `expirationPreset` must be one of:
   - `1_hour`
   - `12_hours`
   - `1_day`
   - `7_days`
   - `30_days`
   - `never`

#### Server

1. `POST /api/links` requires a valid wallet session.
2. The route injects `creatorAddress = session.address`.
3. `parseCreatePaymentLinkInput()` validates:
   - `amountUsdc > 0`
   - valid `creatorAddress`
   - valid `expirationPreset`
   - optional creator metadata normalized safely
4. `createPaymentLink()` generates a unique slug and inserts the row.

#### Database

1. A new `payment_links` row is inserted with:
   - `status = 'active'`
   - `creator_address` from the verified session
   - `recipient_address = creator_address`
   - `amount_usdc`
   - optional creator display metadata

#### Result

- The browser redirects to `/r/[slug]`.

### Common Failure Paths

- No session cookie:
  - server returns 401
  - UI blocks create
- Session/wallet mismatch:
  - UI asks the user to confirm ownership again
- Invalid amount or expiration preset:
  - server returns 400
- Slug collision:
  - server retries slug generation up to five times

## 3. My Links Flow

### Purpose

Show only the links owned by the current verified wallet session.

### Browser

1. `/my-links` loads `useWalletSession()`.
2. If no session exists, the page shows a confirm-ownership prompt.
3. If a session exists and there is no mismatch, the page fetches:
   - `GET /api/my-links?page=...&pageSize=...&status=...`
4. The browser does not send a trusted owner address.

### Server

1. `GET /api/my-links` requires a valid wallet session.
2. The route derives the owner from `session.address`.
3. It validates pagination and optional status filter.
4. `getCreatorPaymentLinks()` queries `payment_links` by `creator_address`.
5. Rows are ordered by `created_at desc`.
6. If an active link is now expired, the read path updates it to `expired`.

### Database

1. `payment_links` is read by `creator_address`.
2. Some rows may be patched from `active` to `expired` during retrieval.

### Result

- The user sees only their own links, paginated and filterable.
- Display labels may show reverse-resolved Basenames for the owner and verified payer, but ownership remains session-derived.

### Common Failure Paths

- No session:
  - route returns 401
  - page shows sign-in/ownership confirmation prompt
- Session mismatch:
  - page pauses loading and asks for re-confirmation
- Invalid status filter:
  - route silently ignores unknown status values and treats them as no filter

## 4. Public Payment-Link Flow

### Purpose

Let anyone open a public payment link and attempt payment through Base Pay.

### Browser

1. The payer opens `/r/[slug]`.
2. The initial page is server-rendered with current link data.
3. The client page can:
   - copy the share URL
   - launch Base Pay if the link is active
   - refresh link status
   - check payment status again if a payment was started
   - resolve display-only Basenames for creator and payer labels

### Server

1. `/r/[slug]` server component loads the link through server-only code.
2. `GET /api/links/[slug]` is also available for client refreshes.
3. Both flows normalize `active -> expired` when needed.

### Database

1. `payment_links` is the source of truth for public page state.

### Result

- Public viewers can pay or inspect the link without owning it.
- Paid links split into three receipt presentations:
  - payer success view when connected wallet matches verified `payer_address`
  - owner receipt view when connected wallet or verified session matches `creator_address`
  - generic paid view for everyone else

### Common Failure Paths

- Unknown slug:
  - page renders not found
- Expired link:
  - the status becomes `expired`
  - the pay action disappears
- Already paid link:
  - the page shows `paid`
  - the payer address is shown if stored

## 5. Payment Confirm Flow

### Purpose

Turn a public payment attempt into a server-verified, database-persisted paid link.

### Happy Path

#### Browser

1. The payer presses the pay button.
2. The client calls:
   - `pay({ amount, to, testnet: false })`
3. Base Pay returns a `paymentId`.
4. The client optionally calls `getPaymentStatus()` for immediate UX.
5. The client sends only `{ paymentId }` to `POST /api/links/[slug]/confirm`.
6. The confirm route is best-effort rate limited per client IP and slug.

#### Server

1. `confirmPaymentLink()` validates `paymentId` format.
2. It loads the link by slug and syncs expiration.
3. It checks whether the link is already paid.
4. It calls `getPaymentStatus({ id: paymentId, testnet: false })`.
5. If status is `completed`, it verifies:
   - payment recipient matches stored `recipient_address`
   - payment amount matches stored `amount_usdc`
6. It derives `payer_address` from the verified status response.
7. It finalizes success through `finalize_payment_link_success(...)`.

#### Database

1. `payment_attempts` gets a row or update for the observed payment state.
2. The finalize RPC inserts/updates the completed attempt.
3. The finalize RPC updates `payment_links` with:
   - `status = 'paid'`
   - `payment_id`
   - `payer_address`
   - `paid_at`

#### Result

- The link becomes permanently paid.
- If the stored `payment_id` matches the tx-hash guard, the UI exposes a BaseScan transaction link.

### Common Failure Paths

#### Pending / failed / not_found

Browser:
- the UI shows the current client-observed status

Server:
- the route stores or updates the attempt status
- the link does not move to `paid`

Database:
- `payment_attempts.status` becomes `pending`, `failed`, or `not_found`

#### Recipient mismatch

Server:
- returns 409
- stores the attempt as `failed`

Meaning:
- the payment hash does not belong to this link

#### Amount mismatch

Server:
- returns 409
- stores the attempt as `failed`

Meaning:
- the payment amount does not match the fixed link amount

#### Already-paid link

Server:
- same `paymentId`: idempotent success path
- different `paymentId`: 409 conflict

Database:
- uniqueness constraints and finalize RPC prevent double-success states

## 6. What Happens Where

### Browser-Only Responsibilities

- rendering forms and payment UI
- showing auth/session prompts
- reading connected wallet state from wagmi
- deriving viewer mode from connected wallet and session wallet
- creating SIWE messages
- signing SIWE messages
- launching Base Pay
- showing immediate payment status copy
- resolving display-only Basenames through a Next.js route

### Server-Only Responsibilities

- validating owner session cookies
- issuing SIWE nonces bound to a signed pre-auth browser state
- consuming SIWE nonces only when the nonce and state hash both match
- verifying signed SIWE messages
- creating links
- loading public links from the database
- loading owner-scoped link history
- verifying payment status against stored business data
- finalizing paid state
- resolving Basenames on the server for display-only identity labels
- applying best-effort route-level abuse limits for expensive public endpoints

### Database Responsibilities

- store canonical payment links
- store payment attempts
- store one-time nonces
- enforce RLS on exposed tables
- enforce uniqueness and idempotency constraints
- run transactional finalize logic for success cases

## 7. Abuse Controls

Current repo-level protection:
- `GET /api/auth/nonce` is rate limited because it creates DB-backed auth challenges
- `POST /api/links/[slug]/confirm` is rate limited because it triggers Base Pay verification and DB writes
- `POST /api/identity/resolve` is rate limited because it triggers reverse-name lookups

Important limitation:
- the current limiter is an in-memory best-effort safeguard inside the app runtime
- durable protection for production still depends on edge/CDN/platform throttling outside the repo
