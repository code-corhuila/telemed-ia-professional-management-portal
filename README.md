# telemed-ia-professional-management-portal

> professional-management bounded context: web UI (remote)

Part of team telemed-ia, Grupo 2. Governance and documentation live in
[telemed-ia-docs](https://github.com/code-corhuila/telemed-ia-docs).

## Branching

Three permanent branches. None accepts a direct commit.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens by re-application (`git cherry-pick -x`).

`main` requires 1 approval from @ariel5253.

## What lives in this repo

The professional-management domain UI, for administrators: the professional profiles of
`telemed-ia-professional-management-api`. Every professional is a general practitioner (DEC-005).

- Angular 21 with Native Federation, zoneless. Exposes `./routes` (`PROFESSIONAL_ROUTES`) as the
  remote `professional`.
- Mounted inside the shell's injector (`telemed-ia-front`): it uses the shell's `HttpClient` and
  its interceptor (gateway URL, token, `X-Correlation-Id`, timeout, errors). The portal never
  calls `provideHttpClient()` and never stores a token (Anexo H).
- It asks for relative routes (`/api/v1/professionals`); only the shell knows the gateway.

## How to run

```
npm ci
npm start   # runs on port 4207
```

## Build and test

The same commands as the CI (`.github/workflows/ci.yml`), with Node 22:

```
npm ci
npm run build
npm run test:ci
```

`npm run build` regenerates `tsconfig.federation.json`; do not commit that change.

## Related documentation

- `telemed-ia-docs/09-microservices/services/04-professional-service/`
- `telemed-ia-docs/07-api/contracts/openapi/professional-service.yaml`
- Anexo H of the repository norm.
