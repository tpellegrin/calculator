# AI agent instructions

Primary instruction file for AI coding agents working in this repository.
Keep it short; defer detail to the linked documents.

## Project purpose

**Calculator** — a full-stack application with a React + TypeScript
frontend and a Go REST service. See [`README.md`](./README.md).

## Repository shape

This is a lightweight pnpm monorepo:

- `apps/web/` — React + TypeScript frontend (`@calculator/web`).
- `apps/api/` — Go HTTP API workspace (`module calculator/apps/api`).
- `docs/` — cross-cutting design and process documentation.

## Current phase

- Monorepo foundation established.
- Frontend foundation complete and tailored (under `apps/web`).
- Calculator API contract is **not yet frozen**.
- Calculator UI is **not implemented**.
- Go backend is a **boundary placeholder only** — no arithmetic, no
  handlers, no runtime server.

Do not implement calculator behavior, the Go service, or a runtime fake
backend until the contract task is complete.

## Ownership boundaries

Frontend (`apps/web`):

- Feature code goes under `apps/web/src/features/calculator/`.
- Shared UI primitives go under `apps/web/src/components/`. Do not put calculator-specific names here.
- All network access goes through `apps/web/src/api/`. Do not put calculator-specific names in the generic API client.
- User-facing copy lives in `apps/web/src/i18n/locales/*.json` and is
  looked up with `useI18n().t('...')`.
- Visual values come from theme tokens in `apps/web/src/styles/themes/`.
- App shell (`apps/web/src/containers/App.tsx`) stays minimal — do not
  add providers to solve feature-specific problems.

Backend (`apps/api`):

- Pure arithmetic and domain errors go under
  `apps/api/internal/calculator/`.
- HTTP decoding, encoding, status mapping, and handler wiring go under
  `apps/api/internal/httpapi/`.
- Server composition and startup go under `apps/api/cmd/server/`.
- The domain package must not import HTTP concerns.

Shared authority: `docs/` — anything spanning both sides (contracts,
error taxonomy, architecture) is documented here first.

## Commands

Run from the repository root:

```bash
pnpm install
pnpm dev:web         # start the Vite dev server for @calculator/web
pnpm build:web       # type-check + production build
pnpm test:web        # single-run tests
pnpm validate        # frontend validation pipeline
```

Workspace-filtered equivalents also work:

```bash
pnpm --filter @calculator/web start
pnpm --filter @calculator/web validate
```

For the Go workspace, when Go is available:

```bash
cd apps/api

# Validate formatting (read-only)
test -z "$(gofmt -l .)"

# Static analysis and build
go vet ./...
go build ./...
go test ./...

# To automatically fix formatting:
# go fmt ./...
```

## Ways of working

All nontrivial implementation work follows [docs/delivery-workflow.md](./docs/delivery-workflow.md).

### Before implementation

- Confirm the task is **Ready** in its task document.
- Read the task specification and authoritative documents.
- Inspect `git status` to ensure a clean starting point.
- Identify scope and stop conditions.
- Do not fill unresolved decisions by guessing; stop and report.

### During implementation

- Remain strictly within the task scope.
- Update tests alongside behavioral changes.
- Keep a decision log for material assumptions.
- **Do not commit** unless explicitly requested by the task.
- Stop on blockers.

### Completion

- Run the full workspace validation suite.
- Manually inspect the diff.
- Provide a clear implementation report.
- Mark work as **Implemented**, not Validated.
- Do not declare review passed.

### Hard rules

- **No commit** unless the user explicitly asks for one. Do not push.
- **An implementation agent must not review or approve its own work as the only reviewer.** Self-verification is required, but it is not equivalent to fresh-context review.
- **No new dependencies** without a concrete feature requiring one and
  an explicit justification.
- **No reintroduction of removed systems** (routing, TanStack Query,
  auth, onboarding, route transitions, Capacitor, GitHub Pages) without
  a documented, feature-driven need and explicit authorization by Thiago.
- **No runtime fake REST backend.** Frontend tests mock the transport;
  local development uses the real Go service.
- **No client-only arithmetic** for operations owned by the API.
- **No duplication** of arithmetic logic between the Go domain and the
  React feature.
- **No HTTP concerns in `internal/calculator`.** The domain stays pure.
- **No cross-language shared package** until two real consumers exist.
- **No heavyweight monorepo tool** (Nx, Turborepo, Bazel, Rush, Lerna).
- **No hardcoded visual values** outside the theme.
- **No `any`.** Use `unknown` and narrow.
- **Do not weaken** tests, lints, or type strictness to pass validation.
- **Record AI prompts** used, in [`docs/ai-usage.md`](./docs/ai-usage.md).

## References

- [`README.md`](./README.md) — project overview, setup, status.
- [`docs/architecture.md`](./docs/architecture.md) — current and intended
  shape.
- [`docs/frontend-foundation.md`](./docs/frontend-foundation.md) —
  frontend adoption decision record.
- [`docs/ai-change-checklist.md`](./docs/ai-change-checklist.md) —
  checklist for bounded changes.
- [`docs/implementation-guide.md`](./docs/implementation-guide.md) —
  where to add features across the monorepo.
- [`docs/ai-usage.md`](./docs/ai-usage.md) — AI use policy and prompt log.
- [`apps/api/README.md`](./apps/api/README.md) — Go workspace overview.
