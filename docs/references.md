# Pay Link References

This file lists the official references that matter for the current codebase. Keep it curated. Do not turn it into a random link dump.

## Base App / Mini App

- [Migrate to a Standard Web App](https://docs.base.org/mini-apps/quickstart/migrate-to-standard-web-app)
  - The most important Base direction for this repo. It explains the move away from Farcaster-specific auth toward wagmi + viem + wallet-based identity.
- [Authenticate Users](https://docs.base.org/base-account/guides/authenticate-users)
  - Reference for the server-issued nonce + SIWE verification model used here.
- [Base Pay in Wagmi Apps](https://docs.base.org/base-account/framework-integrations/wagmi/base-pay)
  - Relevant because this repo uses wagmi for wallet/session state and `@base-org/account` for Base Pay.
- [getPaymentStatus](https://docs.base.org/base-account/reference/base-pay/getPaymentStatus)
  - Reference for the trusted payment-status fields used in confirm logic.
- [Sign Your Manifest](https://docs.base.org/mini-apps/features/sign-manifest)
  - Relevant when updating account association and manifest ownership verification.

## Base Account Authentication and Payments

- [Accept Payments](https://docs.base.org/base-account/guides/accept-payments)
  - Base Pay overview and browser usage for `pay()` and `getPaymentStatus()`.
- [signInWithEthereum capability](https://docs.base.org/base-account/reference/core/capabilities/signInWithEthereum)
  - Background reference only. The current embedded Base App auth path does not use `wallet_connect` as its primary method, but future changes should understand this capability before reintroducing it.

## Wagmi

- [useSignMessage](https://wagmi.sh/react/api/hooks/useSignMessage)
  - The current client auth path uses this hook to sign the SIWE message.
- [baseAccount connector](https://wagmi.sh/react/api/connectors/baseAccount)
  - Useful when adjusting embedded wallet behavior or connector ordering.

## Viem / SIWE

- [createSiweMessage](https://viem.sh/docs/siwe/utilities/createSiweMessage)
  - Used on the client to construct the SIWE payload.
- [parseSiweMessage](https://viem.sh/docs/siwe/utilities/parseSiweMessage)
  - Used on the server to parse the incoming SIWE message.
- [validateSiweMessage](https://viem.sh/docs/siwe/utilities/validateSiweMessage)
  - Used on the server for field-level SIWE validation.
- [verifySiweMessage](https://viem.sh/docs/siwe/actions/verifySiweMessage)
  - Used on the server for signature verification and smart-wallet-compatible validation.
- [getEnsName](https://viem.sh/docs/ens/actions/getEnsName)
  - Relevant because the repo now does display-only reverse resolution for creator and payer labels.
- [toCoinType](https://viem.sh/docs/ens/utilities/toCoinType)
  - Relevant because Basename resolution uses Base's coin type while resolving through ENS-compatible infrastructure.

## Supabase Security

- [Securing your data](https://supabase.com/docs/guides/database/secure-data)
  - Reinforces that service-role style keys must stay server-side only.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
  - Relevant because `wallet_auth_nonces`, `payment_links`, and `payment_attempts` have RLS enabled.
- [Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)
  - Relevant to this repo’s defense-in-depth model for public-schema tables.
