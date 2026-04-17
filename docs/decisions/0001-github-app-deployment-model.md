# ADR-0001: GitHub App deployment model

- **Status:** Accepted
- **Date:** 2026-04-17
- **Milestone:** M3.5 — Git Integration
- **Context:** PRD §12.7 open question

## Context

M3.5 adds GitHub as a first-class skill source. To read from customer repositories, issue webhooks, and (later) open pull requests, Cavalry needs a GitHub App. The spec left open whether Cavalry ships a single shared App that every self-hosted deployment installs on the customer's GitHub org, or whether each deployment registers its own App against github.com.

The two options have very different operational shapes.

## Options considered

### A — Single shared `cavalry-sh` App

Anthropic/Cavalry Inc. registers one App on github.com. Every self-hosted customer installs *that App* on their GitHub org. Webhooks fan in to `api.cavalry.sh` and then out to each customer's deployment.

- **Pro:** Zero customer setup beyond "click install."
- **Pro:** No per-deployment App registration friction.
- **Con:** Forces Cavalry to run a central webhook receiver — contradicts the self-hostable core of the product.
- **Con:** Air-gapped and federal customers cannot use it at all.
- **Con:** A single App compromise affects every customer.
- **Con:** Installation tokens are minted by Cavalry's private key, not the customer's, so they remain partly trust-dependent on Cavalry infra even for a self-hosted deploy.

### B — Per-deployment App (accepted)

Each Cavalry deployment registers its own App on github.com. Webhooks post directly to the customer's Cavalry instance. The customer owns the App identity and private key.

- **Pro:** Consistent with "self-hostable governance platform" — no Cavalry-run infra in the trust path.
- **Pro:** Works in air-gapped, GHES, and regulated environments (GHES support is v1+ but the model doesn't need to change).
- **Pro:** Customer can rotate/revoke the private key without coordinating with Cavalry.
- **Pro:** Blast radius of a key compromise is limited to one deployment.
- **Con:** ~5-minute setup friction per deployment (mitigated by wizard).
- **Con:** Each deployment is a distinct App on GitHub, which is fine.

## Decision

**Adopt Option B: per-deployment GitHub App.**

## Consequences

### Environment

The App is configured via env vars loaded by both `apps/web` (webhook verification, OAuth callback, UI install deep-link) and the worker (sync jobs). All variables already exist in `.env.example` §2.4:

```
CAVALRY_GITHUB_APP_ID
CAVALRY_GITHUB_APP_PRIVATE_KEY         # PEM content or @path/to/key.pem
CAVALRY_GITHUB_APP_WEBHOOK_SECRET
CAVALRY_GITHUB_APP_CLIENT_ID
CAVALRY_GITHUB_APP_CLIENT_SECRET
```

`packages/git-provider` accepts these as `GitHubAppConfig`; it is the only module that reads them. `@path/to/key.pem` is resolved relative to the current working directory at process start and cached.

### Setup flow

Three paths a deployment can register its App:

1. **Manifest flow (recommended, default for M3.5):** admin visits `/[org]/skill-repos/connect` with no App configured → UI renders a "Create GitHub App" button that POSTs a GitHub App manifest to `https://github.com/organizations/{org}/settings/apps/new?state={signed}`. GitHub redirects back with a code; Cavalry exchanges it for the App credentials and writes them to `.env` (dev) or shows them for the admin to copy into their secret store (prod). This is the Probot-style flow that avoids manual field-by-field registration.
2. **CLI command (M6):** `cavalry setup github-app` drives the same manifest flow from a terminal and prints the resulting env block.
3. **Manual:** admin registers an App at `github.com/settings/apps/new` with the permission set below and pastes the values into env.

Only path (1) ships in M3.5. Paths (2) and (3) are documented in `docs/guides/connecting-a-git-repo.md`.

### Required App permissions (minimum)

- **Repository permissions:** `Contents: Read-only`, `Metadata: Read-only`, `Pull requests: Read & write` (PR-write is dormant in M3.5 and used only by the M6 UI-edit flow — included now so admins don't have to re-accept a permission prompt later).
- **Subscribe to events:** `push`, `create`, `delete`, `installation`, `installation_repositories`.
- **Where can this App be installed?** "Only on this account" (set by the admin during creation).

### Webhook URL

`{CAVALRY_WEB_URL}/api/webhooks/github`. The manifest flow pre-fills this. Admins using the manual path must enter it themselves; the setup guide documents it.

### What this ADR forecloses

- No shared `cavalry-sh` App on github.com. The marketing site will not link to an install URL on a Cavalry-owned App.
- `packages/git-provider` does not have a "shared App" mode. `GitHubAppConfig` is always required.

### Open follow-ups (not blockers for M3.5)

- GitHub Enterprise Server support requires `baseUrl` on the App config. Add when needed; the provider interface is already a single abstraction.
- For the hosted SaaS offering (out of scope per §10), revisit this ADR — the calculus changes when Cavalry Inc. runs the infra.

## References

- PRD §3 (data model — `git_installations`), §6.1 (threat model — compromised installation), §11 (git integration reference), §12.7 (deferred decisions)
- GitHub App manifest flow: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
