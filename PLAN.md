# Historical Plan Note

This file is a historical note from the hardening phase of the project.

It is **not** the current source of truth for runtime behavior.

Use these files instead:
- [docs/project-overview.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/project-overview.md)
- [docs/current-flows.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/current-flows.md)
- [docs/technical-architecture.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/technical-architecture.md)
- [docs/references.md](/Users/ruslan/repos/AI/codex/base/new-mini-app-quickstart/docs/references.md)

The original goal of this plan was to harden:
- wallet-session-based ownership
- server-authoritative payment confirmation
- database-level one-successful-payment guarantees
- RLS and nonce handling

That work has already been implemented. When changing current behavior, update the live documentation set above instead of editing this file into a second source of truth.
