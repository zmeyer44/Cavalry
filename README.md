# Cavalry

**Governance, observability, and control for AI agent context at enterprise scale.**

Cavalry is a self-hostable control plane for the skills, tiles, rules, and MCP servers your engineering organization uses with AI coding agents. It sits between your developers and every public or private context source and gives platform + security teams:

- **A proxy gateway** for public registries (Tessl, GitHub, generic HTTP) — every install is authenticated, policy-enforced, audited, and content-addressed.
- **A private registry** for org-internal skills, either direct-published via CLI/UI or synced from customer-owned git repositories.
- **A policy engine** with allowlists, blocklists, version pins, and approval gates — enforced at the install hot path.
- **A complete audit trail** with SIEM webhook delivery (Splunk HEC, Datadog logs, generic) and Slack approval notifications.
- **An MCP endpoint** so agents like Claude Code and Cursor discover only the skills your policies permit.

Licensed under [Apache 2.0](LICENSE). Self-host freely, including for commercial use.

## Quickstart

Prerequisites: **Node 20+**, **pnpm 9+**, **Docker**.

```bash
git clone https://github.com/zmeyer44/Cavalry
cd cavalry
cp .env.example .env
pnpm install
docker compose up -d            # postgres + minio
pnpm db:migrate
pnpm dev                        # web + gateway + worker + docs
```

Open [http://localhost:3000](http://localhost:3000), sign up, step through the onboarding wizard. Grab an API token from Settings → API tokens, then:

```bash
npm install -g @cavalry/cli
cavalry login --url http://localhost:3001 --token <paste>
cavalry publish ./my-skill
cavalry install my-namespace/my-skill
```

For deeper setup — GitHub App for git-backed skills, Slack for approvals, audit webhooks, Helm deployment — see the [docs](apps/docs) (or run `pnpm --filter @cavalry/docs dev` and open `http://localhost:3200`).

## Repository layout

```
cavalry/
├── apps/
│   ├── web/              Next.js control plane (UI + tRPC + webhook receivers)
│   ├── gateway/          Hono HTTP service (install hot path, policy, proxy, MCP)
│   ├── cli/              Node CLI distributed as @cavalry/cli
│   ├── docs/             Next.js docs site
│   └── web-e2e/          Playwright end-to-end suite
├── services/
│   └── worker/           pg-boss runtime (git sync, audit webhooks, slack notify)
├── packages/
│   ├── common/           Shared types, zod schemas, constants, errors
│   ├── database/         Drizzle schema + migrations + client
│   ├── auth/             BetterAuth config shared by web + gateway
│   ├── skill-format/     Manifest parser, cavalry.yaml parser, artifact hasher
│   ├── storage/          S3/MinIO/local artifact storage adapter
│   ├── audit/            Audit event emission + webhook delivery (with SIEM adapters)
│   ├── policy/           Pure functional policy engine (98.49% coverage)
│   ├── registry-upstream/ Tessl + GitHub + HTTP proxy adapters + envelope encryption
│   ├── git-provider/     GitHub App client (install tokens, webhooks, read-only repo access)
│   ├── git-sync/         Sync engine (repo → content-addressed artifacts)
│   └── slack/            Slack Web API client + signing verification
├── deploy/
│   ├── docker/           Dockerfiles for web, gateway, worker
│   └── helm/cavalry/     Helm chart for Kubernetes deployment
├── docs/                 PRD and architecture notes
│   ├── PRD.md
│   └── decisions/        ADRs
├── docker-compose.yml    Postgres + MinIO for local dev
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

## Architecture

Three long-lived processes backed by Postgres and an S3-compatible object store:

| Process             | Responsibility                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **apps/web**        | Control plane UI, tRPC API, webhook receivers (GitHub App, Slack interactions).                                     |
| **apps/gateway**    | Install hot path. Evaluates policy, serves cached artifacts, proxies upstream registries, exposes the MCP endpoint. |
| **services/worker** | Background runner for git-repo syncs, audit webhook delivery, and Slack approval posts.                             |

A full write-up — including the policy decision algorithm, the git sync invariants (force-push detection, immutable `skill_versions`), and the approval lifecycle — lives in the [architecture docs](apps/docs/app/architecture/page.tsx).

## Status

**All M0–M6 milestones shipped.** 51/51 turbo tasks (lint · typecheck · test) green; 33/33 Playwright end-to-end specs green covering the [six PRD §8 user journeys](docs/PRD.md#8-user-journeys).

Features shipped in v0.1.0:

- Org / workspace / member / API token management
- Private + proxied skill registry with content-addressed artifacts
- **Policy engine** (allowlist, blocklist, version_pin, require_approval) with RFC 7807 problem+json violations
- **Approval workflow** end-to-end (gateway 202 → admin decides in UI or Slack → CLI retry succeeds)
- **Git-backed skill sources** via GitHub App — push a tag, developers install seconds later
- **Audit events** with signed webhook delivery (generic / Splunk HEC / Datadog formats)
- **MCP endpoint** filtering skills through policy
- **Analytics dashboard** (installs timeseries, top skills, stale skills, workspace adoption)
- **Audit filter + CSV export** and **per-workspace SBOM snapshots**
- **Docker images** (web, gateway, worker) and a **Helm chart**

## Scripts

| Command            | Effect                                          |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Run web + gateway + worker + docs via Turborepo |
| `pnpm build`       | Production build for every workspace            |
| `pnpm lint`        | Lint / typecheck across the monorepo            |
| `pnpm typecheck`   | TypeScript check only                           |
| `pnpm test`        | Vitest unit suites                              |
| `pnpm e2e`         | Playwright end-to-end suite (builds web first)  |
| `pnpm db:generate` | Generate a migration from schema changes        |
| `pnpm db:migrate`  | Apply pending migrations                        |
| `pnpm db:seed`     | Seed dev data                                   |
| `pnpm db:studio`   | Open Drizzle Studio                             |
| `pnpm format`      | Prettier across the repo                        |

## Technology

- TypeScript (strict) across the monorepo
- Turborepo + pnpm workspaces
- Next.js 16 (App Router, Turbopack) with Tailwind 4
- tRPC 11 for the web API
- Hono on Node 20 for the gateway
- Drizzle ORM + Postgres 16
- pg-boss for background jobs (no external broker)
- BetterAuth for authentication
- Zod for validation
- @octokit/app + @octokit/core for GitHub integration
- Vitest (unit) + Playwright (end-to-end)

## Deployment

Two supported paths:

**Docker Compose** (development, demo) — `docker-compose.yml` brings up Postgres + MinIO. Run the app processes with `pnpm dev` or build images from `deploy/docker/Dockerfile.{web,gateway,worker}`.

**Helm** (production) — `deploy/helm/cavalry/` deploys web, gateway, and worker Deployments with a pre-install migration Job. Point `secret.keys.DATABASE_URL` at your managed Postgres. See `deploy/helm/cavalry/README.md` for the production checklist.

Container images ship to `ghcr.io/cavalry-sh/{web,gateway,worker}:<version>` on every `v*.*.*` tag push via `.github/workflows/release.yml`.

## Documentation

- [`apps/docs/`](apps/docs) — quickstart, architecture, policies, skill repos, approvals, audit webhooks, CLI reference, REST API reference, MCP reference
- [`docs/PRD.md`](docs/PRD.md) — full product spec and milestone plan
- [`docs/decisions/`](docs/decisions) — ADRs for non-obvious decisions (e.g. per-deployment GitHub App model)

## License

Apache License 2.0. See [`LICENSE`](LICENSE) for terms.
