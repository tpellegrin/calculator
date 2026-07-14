# Implementation guide

Where and how to extend code in the Calculator monorepo.

Code changes are executed through the task and review process defined in [docs/delivery-workflow.md](./delivery-workflow.md).

## Workspaces at a glance

- **Frontend** — `apps/web/` (`@calculator/web`).
- **Backend** — `apps/api/` (`module calculator/apps/api`).
- **Shared documentation** — `docs/`.

## Add calculator behavior

Adding or changing calculator behavior is a **full-stack** change.
Follow this sequence:

1. Define or update the arithmetic semantics in `docs/` (operation
   identifier, arity, numeric policy, error taxonomy, examples).
2. Update the Go domain in `apps/api/internal/calculator/` (pure
   function + tests, no HTTP concerns).
3. Update the HTTP mapping in `apps/api/internal/httpapi/` (request
   decoding, response encoding, HTTP status mapping, error envelopes).
4. Update the typed frontend API contract in `apps/web/src/api/`
   (request/response types, error decoding).
5. Update the React feature in `apps/web/src/features/calculator/`.
6. Update tests on both sides (domain, transport, and user-level
   interaction).
7. Update documentation (README, `docs/architecture.md`, contract
   document).

Do not encode arithmetic for the new operation in the browser: the
backend remains authoritative.

## Add or change an endpoint

- **Contract first.** Update the contract document in `docs/` before
  code.
- The Go transport (`apps/api/internal/httpapi/`) owns HTTP request
  decoding, response encoding, and status mapping. It never contains
  arithmetic.
- The frontend API layer (`apps/web/src/api/`) owns request integration
  and response typing. It never contains fallback arithmetic.
- Preserve a stable error schema; if a new error code is required, add
  it additively.
- Test both sides: transport-level tests in Go, and integration tests
  through the typed boundary on the frontend.

## Add shared code across languages

Do not create a cross-language shared package. TypeScript and Go types
should remain separately implemented against one documented contract in
`docs/`.

Do not introduce code generation between the two languages unless a
concrete, recurring drift problem later justifies it.

If a shared _same-language_ package is eventually needed:

- Wait until at least two real consumers exist.
- Place it under `apps/` or under a new sibling directory only after the
  workspace change is discussed.
- Add it to `pnpm-workspace.yaml` explicitly.

## Add a frontend primitive

- Place it under `apps/web/src/components/`.
- Keep it domain-neutral: no calculator terms in props, types, or copy.
- Consume theme tokens (`props.theme.*`) — no hardcoded colors,
  spacing, or fonts.
- Provide accessibility affordances (labels, roles, focus visibility,
  keyboard support).
- Add a focused test for meaningful behavior. Avoid render-only tests.

## Add calculator-specific frontend behavior

- Place it under `apps/web/src/features/calculator/`.
- Access the API through `apps/web/src/api/` — never call `fetch`
  directly.
- Keep request lifecycle (loading, error, cancellation) in a colocated
  `logic.ts` or dedicated hook; presentational components stay
  declarative.
- Externalize all user-facing copy through
  `apps/web/src/i18n/locales/`.

## Add backend domain behavior

- Place it under `apps/api/internal/calculator/`.
- Keep the package free of HTTP types, JSON encoding, and status codes.
- Prefer pure functions with explicit inputs and outputs.
- Add table-driven tests, including edge cases (division by zero,
  overflow, non-finite operands).
- Return domain errors that `internal/httpapi/` can map to HTTP status
  codes and error envelopes.

## Add HTTP behavior

- Place it under `apps/api/internal/httpapi/`.
- Handlers decode inputs, invoke `internal/calculator`, encode
  responses, and map domain errors to HTTP status codes.
- Do not compute arithmetic here.
- Compose handlers from `apps/api/cmd/server/main.go` once the server
  is implemented.

## Add a locale

- Update the supported-locale authority in
  `apps/web/src/i18n/index.ts` (the `SUPPORTED_LOCALES` / `locales`
  list).
- Add the locale JSON file under `apps/web/src/i18n/locales/`.
- Maintain **key parity** with `en-US`; run
  `pnpm --filter @calculator/web i18n:check`.
- Verify pseudolocalization still passes (text expansion, layout).
- Do not translate stable domain identifiers (operation IDs, error
  codes, event names).

## Reintroduce a removed system

Removed systems (routing, TanStack Query, global state, authentication,
persistent storage, animation framework, GitHub Pages deployment,
Capacitor) may return only when a **concrete implemented need** requires
them.

Before reintroducing any of them, document in the PR:

- The specific feature that requires it.
- Why lighter-weight alternatives are insufficient.
- The migration or rollback plan.

Do not restore a system "just in case".

## Principles

- Change the smallest surface that solves the problem.
- Follow existing patterns before inventing new ones.
- Keep domain vocabulary out of shared code and shared vocabulary out
  of domain code.
- Prefer additive changes to the API contract; breaking changes must
  be explicit.
- Do not mix workspace concerns in a single change unless the change
  crosses a documented contract.
