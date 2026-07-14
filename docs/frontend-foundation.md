# Frontend foundation — adoption decision record

This document is the **architectural decision and handoff record** for how
the Calculator frontend (`apps/web`) was tailored from a personal React
foundation. It is not the project's public identity — see
[`../README.md`](../README.md) for that. Read this document when you need
the rationale for what was kept, simplified, or removed, and the
constraints that follow from those choices.

> The frontend was initialized from a personal React foundation and then
> reduced under the constraints below. The repository now lives as a
> lightweight monorepo (`apps/web` frontend, `apps/api` Go workspace,
> shared `docs/`); nothing in this record depends on the previous
> single-package layout.

> This record should stay stable. It is not a running implementation diary;
> new implementation work should update the README, architecture, and
> checklist documents instead of expanding this file.

## Approach

The personal foundation is broad by design. Rather than either "start over"
or "keep everything just in case", the adoption was framed as **subtraction
under constraints**:

- Do not add new dependencies.
- Do not implement calculator features yet.
- Do not preserve any system that no retained code depends on.
- Do not delete strong primitives that a calculator will plausibly use.
- Do not silence validation.

The result is a small, obvious frontend shell that still exercises
styled-components, an i18n message layer, an error boundary, and a neutral
API client — everything needed to build a calculator UI on top without
re-architecting anything.

## Temporary statements

A few conditions in this repository are **pre-implementation**, not defects:

- `apps/web/src/features/` is empty. The calculator feature will live
  there once the API contract lands.
- The API layer is transport-only. There are no calculator operations,
  request/response types, or server error codes yet.
- The rendered UI is a semantic placeholder (`<main>` + a few text blocks).
- The Go workspace under `apps/api` is a boundary placeholder only — no
  arithmetic and no HTTP transport are implemented yet.

The upcoming contract task will produce a decision artifact covering
operation semantics, numeric policy, request/response shapes, error
taxonomy, and the frontend/backend integration boundary. This document
should gain a link to that artifact once it exists — no placeholder link
is added now to avoid a broken reference.

## Final architectural shape

```
apps/web/src/
├── api/                 fetch client + ApiError taxonomy + transport types
├── assets/fonts/Inter/  local Inter font (regular, medium, semibold) + license
├── components/          Button, ButtonBase, Box, Flex, Text, Form/Input,
│                        LabeledInputField, ErrorBoundary
├── containers/          App.tsx (shell) + App.test.tsx (smoke test)
├── features/            (empty; reserved for calculator features)
├── hooks/               useMediaQuery
├── i18n/                index.ts, provider.tsx, locales/{en-US,pt-BR,pseudo}
├── styles/              global.ts, fonts.ts, media.ts, mixins.ts, themes/*
├── test/                setup.ts, utils.tsx (Theme + I18n wrapper)
├── utils/               colors, css, numberFormat, types
├── main.tsx
└── vite-env.d.ts
```

## Kept

- **Styled-components + design tokens** — clean setup, no runtime cost of
  concern, tokens exercised by every retained primitive.
- **Local Inter font (Regular / Medium / SemiBold)** — deterministic
  rendering, no external font request, SIL OFL license retained. Bold and
  ExtraBold weights were not being used; kept only the three used weights.
- **Component primitives**: `Button`, `ButtonBase`, `Box`, `Flex`, `Text`,
  `Form/Input`, `Form/common/Control`, `LabeledInputField`, `ErrorBoundary`.
  A calculator UI will plausibly need buttons, an input field, and
  responsive layout primitives.
- **`useMediaQuery`** — small and used by the media helpers.
- **i18n message layer** — externalized copy, pseudo locale for
  text-expansion checks, `pt-BR` as a real second locale, and an
  automatically-enforced consistency script.
- **DX tooling** — ESLint, Stylelint (with a11y + logical-property rules),
  Prettier, Vitest + Testing Library, Husky/lint-staged, Commitlint, and a
  CI workflow that runs `pnpm validate` + `pnpm build`.

## Simplified

- **App shell**: six providers (QueryClient / Theme / I18n / Auth /
  Navigation / ProgressBar / AppRouter) reduced to three
  (Theme / I18n / ErrorBoundary). No routing, no auth, no query cache.
- **ButtonBase**: dropped the anchor-polymorphic branch (and its
  `utils/links` dependency); it's now a pure button primitive. Ref
  merging is inlined instead of using a `utils/react` helper.
- **`styles/media.ts`**: dropped the `utils/objects` dependency by
  inlining `keysOf`.
- **i18n**:
  - Locales trimmed to `en-US`, `pt-BR`, and `pseudo`. Spanish was removed
    (no explicit product need; keeping it as an empty shell would be
    misleading).
  - Removed `formatCurrency`, `formatPercent`, and `formatDuration`: the
    calculator does not need them today, and each pulled a domain-specific
    currency assumption. `formatNumber` is retained as a locale-aware
    helper for future numeric display.
  - Removed the language-selector UI component: the application is
    single-locale from the user's perspective.
- **`vite.config.ts`**: removed GitHub Pages base-path logic and the
  earlier `optimizeDeps`/`define` scaffolding.
- **`.env.example`**: reduced to a single `VITE_API_BASE_URL` variable.
- **`tsconfig.json`**: removed `include` entries pointing at files that
  no longer exist (`.storybook/preview.tsx`, `capacitor.config.ts`, etc.).

## Removed

| System                                                                                                                                  | Rationale                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/auth/**`, `src/guards/**`                                                                                                          | Calculator has no authentication.                                                                              |
| `src/views/**` (guest/user/onboarding)                                                                                                  | Demo pages tied to auth/onboarding, not to the calculator.                                                     |
| `src/flows/**`                                                                                                                          | Multi-step flow contract; calculator is a single screen.                                                       |
| `src/containers/AppRouter*`, `containers/Router`, `containers/Layouts/**`                                                               | Router switcher + layout chrome no longer needed with a single-screen app.                                     |
| `src/globals/**`                                                                                                                        | Held `react-query.ts`, path registries, and navigation/progress/scroll contexts — all tied to removed systems. |
| `src/components/Animations/**`, `AnimatedOutlet`, `CenterOnlyTransition`, `Progress`, `AutoFitText`, `CardBase`, `Carousel`, `LinkBase` | Route-transition + FLIP + navigation-specific animation and layout primitives; unused after routing removal.   |
| `src/components/Form/{FileInput,Range,Select,Textarea}`                                                                                 | Calculator will not need file uploads, ranges, complex selects, or free-text areas.                            |
| Router / flow / transition / scroll / gesture / touch / mouse hooks                                                                     | Coupled to routing and animations that were removed.                                                           |
| `src/utils/{form,links,objects,transitions,react}`                                                                                      | Consumers were removed or the last remaining usage was inlined.                                                |
| `src/api/demoApi*`, `queryKeys.ts`                                                                                                      | Demo API + query-key registry — replaced by the neutral `client.ts` / `errors.ts` / `types.ts`.                |
| `capacitor.config.ts`, `@capacitor/core`                                                                                                | Calculator is a responsive web app, not a native wrapper.                                                      |
| `.github/workflows/deploy-pages.yml`                                                                                                    | The final application ships with a backend, not as a static Pages site.                                        |
| `es-ES` locale + `LanguageSelector`                                                                                                     | No product requirement; keeping empty shells would be misleading.                                              |
| `docs/{adoption,flows,animation-system,mobile-capacitor}.md`, `docs/decisions/`                                                         | Documented systems that were removed.                                                                          |

## Dependencies

Removed direct dependencies:

- `@tanstack/react-query`
- `react-router-dom`
- `react-transition-group` + `@types/react-transition-group`
- `@capacitor/core`

Kept direct dependencies:

- `react`, `react-dom` — application runtime.
- `styled-components`, `styled-normalize` — styling system.
- `vite-plugin-svgr`, `vite-tsconfig-paths` — Vite integrations used by
  the retained code (`svg?react` imports and TS path aliases).

No new dependencies were introduced.

## Known constraints / deferred work

- **Routing**: none. If a genuine second screen appears (e.g., a history
  page), reintroduce a router deliberately at that point.
- **Data fetching**: no query cache. If several endpoints appear with
  distinct caching / retry / cancellation needs, revisit TanStack Query.
  For now, a typed client and focused custom hooks are more legible.
- **API contract**: intentionally not defined yet. The
  `docs/frontend-foundation.md` boundary ends here; the calculator API
  contract (operations, payloads, error codes) is the next task.
- **Feature layer**: `apps/web/src/features/` is empty. Calculator UI +
  hooks live there once the contract lands.
- **Backend workspace**: `apps/api/` establishes the Go module and
  package boundaries but contains no runtime behavior yet.

## Boundaries for subsequent tasks

- Do not silently reintroduce removed systems. If a task genuinely
  requires one, call it out explicitly in the PR description.
- New user copy must be added to all three locales and pass
  `pnpm --filter @calculator/web i18n:check`.
- New primitives belong in `apps/web/src/components/`; calculator-specific
  views and hooks belong in `apps/web/src/features/<feature>/`.
- New network access goes through `apps/web/src/api/client.ts`.
- Go domain logic belongs in `apps/api/internal/calculator/`; HTTP
  transport belongs in `apps/api/internal/httpapi/`. Do not mix them.
