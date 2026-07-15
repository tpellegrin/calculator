# T-008 — Application wiring and local development

- **Status**: Implemented
- **Depends on**: T-001, T-004 (runnable backend), T-005, T-006, T-007
- **Owner**: Thiago (implementer TBD)

## Objective

Mount the calculator feature in the app shell, configure the Vite
dev-server proxy so the frontend uses same-origin `/api` calls by
default, honor `VITE_API_BASE_URL` when set, and document the
full-stack local run commands.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), §12.2,
  §13.
- [`docs/frontend-foundation.md`](../frontend-foundation.md).
- [`docs/architecture.md`](../architecture.md).
- Existing Vite config under `apps/web/`.

## Context

The calculator feature (T-007) exists but is not mounted; the Vite
dev server does not proxy to the Go server; there is no documented
full-stack run command.

## Accepted decisions

- Same-origin `/api` by default; the frontend does not depend on
  CORS.
- Vite dev proxy from `/api` → `http://localhost:${PORT ?? 8080}`.
- `VITE_API_BASE_URL` overrides the base at build/dev time; when
  empty, same-origin is used.
- No CORS middleware added on the Go server for this task.

## Scope

- Update `apps/web/vite.config.ts` (or equivalent) to add a proxy
  entry for `/api`.
- Update `apps/web/src/containers/App.tsx` to mount the calculator
  feature exported by T-007 (single import + render inside the
  existing `<main>` landmark; no new providers).
- Add a root `pnpm` script (or document existing scripts) for the
  full-stack local run: one command to start the Go server and one
  to start the Vite dev server side by side. If no cross-platform
  runner is available without a new dependency, document manual
  two-terminal instructions instead — do **not** add a dependency
  for this.
- Update `README.md` with the local full-stack run instructions.

## File scope

Permitted:

- `apps/web/vite.config.ts` (proxy addition only).
- `apps/web/src/containers/App.tsx` (single mount).
- `apps/web/.env.example` (optional; `VITE_API_BASE_URL`).
- `README.md` (local run section).
- `package.json` at the repo root **only** to add npm scripts that
  do not require a new dependency.

Not permitted:

- Adding an npm dependency.
- Broad edits to `App.tsx` beyond mounting the feature.
- Changing any file under `apps/api/**` (server behavior is fixed
  by T-004).

## Out of scope

- Introducing a route or router.
- Adding new global providers (theme/i18n providers already exist).
- CORS.

## Required implementation

1. Vite proxy:
   ```ts
   // apps/web/vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
         changeOrigin: false,
       },
     },
   }
   ```
2. App shell:
   - Replace the semantic `<main>` placeholder with
     `<CalculatorView />` from T-007;
   - Do not add new providers;
   - Do not introduce routing.
3. Full-stack local run:
   - Document in `README.md`:
     - terminal 1: `cd apps/api && go run ./cmd/server`;
     - terminal 2: `pnpm dev:web`.
   - Optional: a `pnpm dev` script that runs both concurrently
     **only** if a stdlib-only shell command suffices (e.g., a small
     shell script) — never via a new npm package.

## Required behavior

- Loading `http://localhost:5173/` shows the calculator UI mounted
  in the existing app shell.
- A calculation posted via `=` flows through the Vite proxy to the
  Go server and returns a valid response.
- `VITE_API_BASE_URL=http://localhost:9090 pnpm dev:web` targets the
  overridden origin (proxy target and/or fetch base updated
  consistently in the transport client).
- `pnpm build:web` succeeds and produces a bundle that uses
  same-origin `/api` when `VITE_API_BASE_URL` is empty.

## Edge cases

- Backend not running: the frontend shows a network failure with
  Retry (state model behavior; no change required in this task).
- `VITE_API_BASE_URL` set to a value without a scheme → build/dev
  fails loudly; documented in README.

## Tests

- No new automated tests are strictly required. Rely on:
  - existing T-005/T-006/T-007 unit tests;
  - manual smoke: `pnpm dev:web` + `go run ./cmd/server`, perform
    one add, one divide, one power, one sqrt, one percentage, one
    invalid case; capture the outcomes in the completion report.

## Validation

```bash
pnpm --filter @calculator/web format:check
pnpm --filter @calculator/web lint
pnpm --filter @calculator/web typecheck
pnpm --filter @calculator/web test
pnpm --filter @calculator/web build
pnpm validate
git diff --check
```

Also, from `apps/api/`:

```bash
go vet ./...
go test ./...
go build ./...
```

## Documentation impact

- `README.md` gains a "Local full-stack development" section.
- `docs/architecture.md` may receive a one-line update noting the
  proxy topology; keep within existing sections.

## Stop conditions

- A concurrent-runner requirement forces a new dependency.
- The app shell requires additional providers (owner decision needed).
- Backend or frontend does not accept same-origin `/api` calls after
  wiring (indicates a bug in T-003, T-004, or T-005 — escalate).

## Completion report

- Files modified; manual smoke result; validation output;
  screenshots optional; explicit confirmation: no new dependency,
  no CORS added, no routing added.
