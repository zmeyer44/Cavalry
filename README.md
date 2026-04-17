# Cavalry

Governance, observability, and control for AI agent context at enterprise scale.

Cavalry is a self-hostable governance platform for AI agent context — skills, tiles, rules, and MCP servers. It proxies public registries through a policy-enforcing gateway, hosts an internal registry for org-specific skills, and produces a complete audit trail of every install, publish, and policy change.

## Quickstart (development)

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000, sign up, and land on the org dashboard.

## Repository layout

```
cavalry/
├── apps/
│   ├── web/          Next.js 16 control plane (UI + tRPC)
│   ├── gateway/      Hono proxy service (added in M3)
│   └── cli/          Node CLI (added in M2)
├── services/
│   └── worker/       Background jobs (added later)
├── packages/
│   ├── common/       Shared types, zod schemas, constants
│   ├── database/     Drizzle schema + client + migrations
│   ├── auth/         BetterAuth config
│   └── ...           Additional packages land in later milestones
├── docker-compose.yml
├── .env.example
└── docs/
```

See [docs/PRD.md](docs/PRD.md) for the full product spec and milestone plan.

## Scripts

| Command            | Effect                                                   |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Run all apps in dev mode via Turborepo                   |
| `pnpm build`       | Production build for every workspace                     |
| `pnpm lint`        | Run lint for every workspace                             |
| `pnpm typecheck`   | TypeScript check across the monorepo                     |
| `pnpm test`        | Run Vitest suites                                        |
| `pnpm db:generate` | Generate a migration from schema changes                 |
| `pnpm db:migrate`  | Apply pending migrations                                 |
| `pnpm db:seed`     | Seed dev data                                            |
| `pnpm db:studio`   | Open Drizzle Studio                                      |
| `pnpm format`      | Prettier across the repo                                 |

## Technology

- TypeScript (strict) across the monorepo
- Turborepo + pnpm workspaces
- Next.js 16 (App Router, Turbopack) with Tailwind 4
- tRPC 11 for the web API
- Hono on Node 20 for the gateway
- Drizzle ORM + Postgres 16
- BetterAuth for authentication
- Zod for validation
- Vitest + Playwright for testing

## Status

Milestone M0 (Foundation) — working auth and dashboard stub. See `docs/PRD.md` for roadmap.
# Cavalry
