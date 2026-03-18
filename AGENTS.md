# AGENTS.md

## Project Summary

This repo contains **Pay Link**, a Base Mini App for creating and sharing a fixed-amount, one-time USDC payment link on Base mainnet.

Core rule:
- one link = one successful payment

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- wagmi + viem
- `@base-org/account` for Base Pay
- `@farcaster/miniapp-sdk` and `@farcaster/miniapp-wagmi-connector` for embedded Mini App behavior
- Supabase REST API through a server-only helper

## Read These Docs Before Making Assumptions

Primary source-of-truth docs:
- [docs/project-overview.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/project-overview.md)
- [docs/current-flows.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/current-flows.md)
- [docs/technical-architecture.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/technical-architecture.md)

Supporting docs:
- [docs/references.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/references.md)
- [docs/pay-link-context.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/pay-link-context.md)

Historical note only:
- [PLAN.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/PLAN.md)

## Working Rules

- Inspect the current code and the docs above before changing behavior.
- Prefer the current code and official docs over stale assumptions.
- Do not treat Mini App context, FID, username, display name, or avatar metadata as auth or ownership authority.
- Treat Basename / reverse-resolved names as display-only as well.
- Do not reintroduce insecure trust boundaries:
  - client `creatorAddress` must not control ownership
  - `/my-links` must remain session-derived
  - client payment status, payer, recipient, and amount must not be trusted as authoritative
  - transaction links must come only from guarded `payment_id` values that are real tx hashes
  - do not reintroduce an editable creator/recipient split in the current product without updating the docs and server contract together
- Keep Base App embedded behavior in mind. Wallet UX that works in Base Preview or Base App may not reproduce in a plain localhost browser.

## Docs Sync Rules

If a task changes any of the following, update the relevant docs in the same task:
- product behavior
- routes or page responsibilities
- auth/session behavior
- payment flow
- trust boundaries
- database schema or migrations
- environment variables
- manifest/distribution metadata or referenced app assets
- UI copy that changes product meaning
- Base App / Mini App specific behavior

Minimum expectation:
- product and flow changes: update [docs/project-overview.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/project-overview.md) and [docs/current-flows.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/current-flows.md)
- architecture, file layout, RLS, RPC, env, or tech-stack changes: update [docs/technical-architecture.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/technical-architecture.md)
- official-doc maintenance: update [docs/references.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/references.md)

## Security and Ownership Reminders

- Secure ownership currently comes from the verified SIWE session cookie.
- The current product treats the owner wallet and receiving wallet as the same actor in the UI.
- `recipient_address` remains an internal trusted verification field and must continue to be derived from the verified owner wallet unless the product rules change intentionally.
- Creator metadata is display-only.
- Payer address is trusted only after server-side payment verification.
- Creator/payer names resolved from address are convenience labels only.
- Public payment links may be public, but owner-only data access must remain server-controlled.

## Migration and Env Rules

- When adding or changing a migration, update the docs that describe schema, RLS, RPCs, or data guarantees.
- When adding or renaming environment variables, update the docs that describe env and deployment requirements.
- Do not assume the repo contains the original base-table creation migration; check the existing migrations and live-schema expectations before editing schema docs.

## Validation Expectations

For code changes, run the relevant validation commands when possible.

Common commands in this repo:
- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`

For documentation-only tasks, keep docs synchronized and avoid leaving contradictory files behind.

## Recommended Sub-Agent Setup

Use only `gpt-5.3-codex` or `gpt-5.4` for this repo.

Preferred baseline:
- `Repo Search Explorer`
  - agent type: `explorer`
  - model: `gpt-5.3-codex`
  - purpose:
    - map routes, data flow, env usage, and file ownership
    - find all call sites before edits
    - answer narrow codebase questions quickly
  - should not own code edits

- `Docs / MCP Explorer`
  - agent type: `explorer`
  - model: `gpt-5.4`
  - purpose:
    - use Context7 for current library/framework docs
    - use Figma MCP for design tasks
    - verify Base / wagmi / viem / Next.js details against official docs before risky changes
  - use this when current external API behavior matters more than repo-local search

- `Implementation Worker`
  - agent type: `worker`
  - model: `gpt-5.4`
  - purpose:
    - make production code changes in a clearly assigned write scope
    - good default for app logic, UI, auth, payments, metadata, or docs changes
  - assign explicit file ownership before delegating

Useful optional agents:
- `Security Explorer`
  - agent type: `explorer`
  - model: `gpt-5.4`
  - purpose:
    - review trust boundaries
    - trace auth/session/payment verification behavior
    - inspect migrations, env usage, and deployment-sensitive config

- `UI Worker`
  - agent type: `worker`
  - model: `gpt-5.4`
  - purpose:
    - isolated redesign or component work in `app/` and `components/`
    - pair with Figma MCP work from the Docs / MCP Explorer

## Sub-Agent Rules For This Repo

- Start with `Repo Search Explorer` for non-trivial tasks before code changes.
- Use `Docs / MCP Explorer` whenever changing:
  - `wagmi`
  - `viem`
  - `@base-org/account`
  - Base Mini App / manifest / metadata behavior
  - any Figma-driven UI
- Keep `Implementation Worker` write scopes disjoint.
- Do not run two workers on the same file set.
- Good split examples:
  - one worker on `app/` UI
  - one worker on `lib/` or `app/api/`
  - one worker on docs/config such as `README.md`, `docs/`, `farcaster.config.ts`
- Bad split examples:
  - two workers both editing `app/r/[slug]/PaymentLinkClient.tsx`
  - two workers both changing auth/session files under `lib/auth/`

## Context7 / MCP Guidance

- Context7 is useful here for current official usage of:
  - `wagmi`
  - `viem`
  - `Next.js`
  - other supported external libraries
- Prefer Context7 or official docs when changing integration details.
- Do not use Context7 for repo-local questions that can be answered faster by code search.
- Figma MCP is relevant only for design implementation tasks.
- Playwright/browser tooling is relevant for runtime UI/debug validation, not for static codebase analysis.
