# Cavalry Helm chart

Basic chart for the Cavalry governance platform. Deploys three components
(web, gateway, worker) plus a pre-install migration Job. Postgres is a
required external dependency — point `secret.keys.DATABASE_URL` at your
managed Postgres 16 instance.

## Install

```bash
helm upgrade --install cavalry ./deploy/helm/cavalry \
  --namespace cavalry --create-namespace \
  --set config.webUrl=https://cavalry.example.com \
  --set config.gatewayUrl=https://gateway.cavalry.example.com \
  --set secret.keys.DATABASE_URL=postgres://user:pass@postgres/cavalry \
  --set secret.keys.BETTER_AUTH_SECRET=<rotate-me-32+-chars> \
  --set secret.keys.CAVALRY_ENCRYPTION_KEY=<rotate-me-32+-chars>
```

## Production checklist

- Use `secret.existingSecret` and manage secrets out of band (sealed secrets,
  external-secrets operator, etc.). Do not commit secrets to `values.yaml`.
- Set a non-default `config.storage.provider=s3` with a real bucket — the
  `local` provider is dev-only.
- Tune `gateway.replicaCount` upward; it's the hot path.
- Integration env vars (GitHub App, Slack) are optional — omit to disable
  those features entirely.

## Status

This is the v0.1.0 chart (M6 of the PRD). Production hardening
(PodDisruptionBudgets, HorizontalPodAutoscaler, NetworkPolicies, separate
read/write DB users) lands in v1+.
