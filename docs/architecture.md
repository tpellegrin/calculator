# Architecture

Architecture of the **Calculator** repository. This document describes the
current shape of the codebase and the intended target once the arithmetic
contract and the Go REST service are implemented. See
[`frontend-foundation.md`](./frontend-foundation.md) for the frontend
adoption record.

## Repository shape

Lightweight pnpm monorepo:

```
calculator/
├── apps/
│   ├── web/     # React + TypeScript frontend  (@calculator/web)
│   └── api/     # Go HTTP API workspace         (module calculator/apps/api)
└── docs/        # Cross-cutting design and process documentation
```

No monorepo framework is in use (no Nx, Turborepo, Bazel, Rush, or Lerna).
Root-level `package.json`, `pnpm-workspace.yaml`, CI, and later Docker
Compose are sufficient at this scale.

## Current state

Implemented today:

- Monorepo layout (`apps/web`, `apps/api`, `docs`).
- React shell in `apps/web/src/containers/App.tsx` composing three
  providers: `ThemeProvider` + global/font styles, `I18nProvider`, and
  `ErrorBoundary`. No router, no data-fetching provider, no auth.
- Transport-only frontend API client
  (`apps/web/src/api/{client.ts,errors.ts,types.ts}`). No calculator
  operations are wired up.
- Reusable UI primitives in `apps/web/src/components/` (`Button`,
  `ButtonBase`, `Box`, `Flex`, `Text`, `Form/Input`,
  `LabeledInputField`, `ErrorBoundary`).
- i18n layer with `en-US`, `pt-BR`, and a `pseudo` locale for
  text-expansion checks.
- Test setup with Vitest + Testing Library.
- Repository-level validation (format, lint, stylelint, typecheck, i18n
  parity, tests).
- Go workspace boundary under `apps/api` — `go.mod`, package doc
  comments in `internal/calculator` and `internal/httpapi`, and a
  placeholder `cmd/server/main.go`.

Not implemented yet:

- The calculator UI feature (`apps/web/src/features/calculator/`).
- Calculator API request/response types on the frontend.
- The Go HTTP transport (`apps/api/internal/httpapi`).
- The pure arithmetic domain (`apps/api/internal/calculator`).
- Docker Compose orchestration.
- End-to-end tests.

## Target architecture

```
+-------------------------------+
| React calculator feature      | apps/web/src/features/calculator/
| presentation + interaction    |
+---------------+---------------+
                |
+---------------v---------------+
| Typed frontend API boundary   | apps/web/src/api/
| request / response / errors   |
+---------------+---------------+
                |
                | HTTP
                |
+---------------v---------------+
| Go HTTP transport             | apps/api/internal/httpapi/
| handlers, decoding, mapping   |
+---------------+---------------+
                |
+---------------v---------------+
| Pure calculator domain        | apps/api/internal/calculator/
| arithmetic and validation     |
+-------------------------------+
```

The diagram uses **HTTP**, not HTTPS: local development uses plain HTTP,
and transport security is a deployment concern. HTTPS termination is
handled at deployment time and is intentionally kept out of the
application-domain architecture.

The frontend and backend meet at a small, versioned contract to be
finalized in the next task. Nothing above the "Typed frontend API
boundary" line assumes anything about the transport, and the arithmetic
domain deliberately does not import HTTP types.

## Principles

- **Arithmetic is independent from HTTP.** The Go arithmetic domain
  (`internal/calculator`) is a pure package; `internal/httpapi` is a
  thin adapter.
- **The backend is authoritative for validation.** Frontend validation
  improves UX but never substitutes for backend checks.
- **The frontend owns interaction and presentation.** No calculator
  results are computed client-side for operations owned by the API.
- **API errors are stable and typed.** A small, documented error
  taxonomy crosses the boundary; ad-hoc error strings are rejected.
- **No database.**
- **No authentication.**
- **No distributed-system theater** (no queues, no service discovery,
  no GraphQL, no gateways).
- **No monetary-ledger claims.** Floating-point arithmetic is not
  marketed as financial precision; if precision matters, it is stated
  explicitly.
- **No cross-language shared package.** TypeScript and Go types are
  implemented separately against one documented contract until two
  real consumers justify a shared source.
- **Optional operations remain additive.** Adding an operation must not
  break existing consumers.

## App shell

`apps/web/src/containers/App.tsx` composes:

1. `ThemeProvider` + `GlobalStyle` + `FontStyles` — design tokens,
   typography, and the locally bundled Inter font.
2. `I18nProvider` — locale detection, persistence, and message lookup.
3. `ErrorBoundary` — last-resort UI recovery.

The rendered content is a semantic `<main>` placeholder. The calculator
feature will replace it under `apps/web/src/features/calculator/`.

## Styling

- Styled-components with theme tokens in `apps/web/src/styles/themes/`.
- Local styles live in a sibling `styles.ts` (or `styles.tsx` for
  JSX-heavy cases), imported via **direct named imports**.
- Internal styled-component names start with `_` and include the owning
  component name (e.g., `_ButtonRoot`); the top-level element uses the
  `Root` suffix.
- Never hardcode hex, pixel spacing, or font names in feature code.

## i18n

- Supported locales: `en-US` (base), `pt-BR`, `pseudo`. Default is
  `en-US`.
- Lookup via `useI18n().t('dot.path.key', params?)` with `{name}`
  interpolation.
- New copy must be added to **all three** locales;
  `pnpm --filter @calculator/web i18n:check` enforces parity and warns
  about keys used in code but missing from base.
- No user-facing language selector.

## Frontend API layer

`apps/web/src/api/client.ts` wraps `fetch` with:

- Configurable base URL via `VITE_API_BASE_URL`.
- JSON body handling.
- Abort-signal support.
- Normalization of every failure into an `ApiError` with a `kind` in
  `network | aborted | invalidResponse | apiError | unknown`.

There are no retries, no caching, and no calculator-specific
request/response types yet. Domain contracts will be added when the
API contract is frozen.

## Backend workspace

`apps/api/` is a Go module (`module calculator/apps/api`, temporary
path) with:

- `internal/calculator/` — planned pure arithmetic domain. No HTTP
  types.
- `internal/httpapi/` — planned transport layer (decoding, encoding,
  status mapping, handler wiring). No arithmetic logic.
- `cmd/server/main.go` — placeholder entry point that compiles and
  exits with a clear message. It does not open a port and returns no
  canned responses.

See [`../apps/api/README.md`](../apps/api/README.md).

## Testing

- Vitest + Testing Library on the frontend.
- `apps/web/src/test/utils.tsx` exposes `AllTheProviders` (Theme + I18n)
  and a `renderWithProviders` helper.
- `apps/web/src/containers/App.test.tsx` smoke-tests that the shell
  mounts and renders the placeholder inside a `<main>` landmark.
- Go tests will live alongside their packages once implementation
  begins.

## Runtime fake backend — deliberately not added

> **Decision:** no runtime fake REST backend is included in this
> repository.
>
> The real Go API will be introduced early. A separate runtime fake API
> would duplicate the contract and create drift risk. Frontend tests
> use mocked transport responses (Vitest `vi.mock` or `fetch` seams on
> `apps/web/src/api/client.ts`); local development targets the actual
> Go service. See [`../apps/web/src/api/README.md`](../apps/web/src/api/README.md).

## Deliberately absent

- App-state routers, route transitions, and FLIP animation flows.
- Auth adapters, guards, and sign-in views.
- Onboarding flows.
- GitHub Pages deployment.
- Capacitor / native wrapper.
- Heavyweight monorepo tools (Nx, Turborepo, Bazel, Rush, Lerna).
- Cross-language code generation.

These were removed from the earlier foundation; do not reintroduce them
without a documented, feature-driven need. See
[`what-not-to-do.md`](./what-not-to-do.md).
