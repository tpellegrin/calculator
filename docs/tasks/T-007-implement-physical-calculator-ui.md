# T-007 — Implement the physical-calculator UI

- **Status**: Ready
- **Depends on**: T-001, T-006 (uses the state model), T-005 (types)
- **Owner**: Thiago (implementer TBD)

## Objective

Build the visible calculator feature — display, keypad, keyboard
support, focus behavior, loading state, previous-result treatment,
localized errors, i18n parity, and theme-driven visuals — on top of
the state model from T-006 and per contract §14–§17.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), §5.5,
  §14, §15, §16, §17.
- [`docs/frontend-foundation.md`](../frontend-foundation.md).
- Existing i18n at `apps/web/src/i18n/locales/*.json`.
- Existing theme tokens at `apps/web/src/styles/themes/`.
- Shared UI primitives at `apps/web/src/components/`.

## Context

The visible feature is the physical-calculator interface. It consumes
the state model from T-006 and dispatches actions. It contains no
arithmetic and no direct fetch calls.

## Accepted decisions

- Physical-calculator keys per §14: digits, decimal, `+ - × ÷ ^ %`,
  `√`, `±`, `C`, `⌫`, `=`.
- Keyboard mapping per §15.
- Localized user-facing copy in `en-US`, `pt-BR`, and pseudo-locale
  with parity.
- Visual values come only from theme tokens; no hard-coded colors,
  sizes, radii, or fonts in components.
- No hard-coded user-facing strings.
- No CE key.

## Scope

- Feature files under
  `apps/web/src/features/calculator/` (excluding `state/`,
  owned by T-006).
- New calculator-specific i18n keys added to every locale in
  `apps/web/src/i18n/locales/*.json`.
- Behavior and component tests.

## File scope

Permitted:

- `apps/web/src/features/calculator/**` (except `state/**` — do not
  modify; only import).
- `apps/web/src/i18n/locales/*.json` (add calculator keys only).
- New primitives under `apps/web/src/components/` **only** if
  clearly generic; they must not carry calculator-specific names.

Not permitted:

- `apps/web/src/api/**`.
- `apps/web/src/features/calculator/state/**`.
- `apps/web/src/containers/App.tsx` beyond a single import/mount
  (owned by T-008; if a wiring change is needed here, stop and
  coordinate).
- Adding a UI library or npm dependency.

## Out of scope

- App-shell composition and route/mount (T-008).
- Real-server smoke tests (T-009).
- Docker packaging (T-011).

## Required implementation

1. Components:
   - `CalculatorView` — top-level composition;
   - `Display` — current buffer or last result; live region for
     announcements;
   - `Keypad` — grid of buttons producing dispatch actions;
   - `StatusRegion` — pending indicator, error message, retry
     button;
   - `PreviousResult` — clearly identified previous-result treatment
     while a submission is pending.
2. Keyboard mapping (attached at the feature root, not globally):
   - digits `0`–`9` → `digit`;
   - `.` and `,` → `decimal` (locale-aware; when the active locale
     is `pt-BR`, `,` produces `decimal`; when `en-US`, `.` does);
   - `+`, `-`, `*`, `/`, `^`, `%` → `operator`;
   - `s` or a dedicated affordance for `√` → `unarySqrt`;
   - `Enter` or `=` → `equals`;
   - `Backspace` → `backspace`;
   - `Escape` or `Delete` → `clear`;
   - `r` (only when `canRetry`) or an on-screen button → `retry`.
3. Accessibility:
   - buttons have accessible names (visible text or `aria-label`);
   - display is a live region (`aria-live="polite"`);
   - error status is announced;
   - focus order is logical; focus visible; no traps.
4. Localization:
   - all user-facing strings use `useI18n().t('calculator.…')`;
   - a per-error-code map from §8 to a localized message key;
   - parity enforced by `pnpm i18n:check`.
5. Theming:
   - all colors, spacing, radii, fonts, and elevations come from
     theme tokens.
6. Responsive/mobile:
   - keypad remains fully operable on narrow viewports (down to
     320 CSS pixels wide);
   - display truncates gracefully with tooltip/`aria-label`
     preserving full text.

## Required behavior

- Full keyboard operation without touching the mouse.
- Pressing a digit updates the display through the state model.
- Pressing `=` triggers a request and shows a pending indicator.
- On success, the display shows the formatted result; previous input
  is preserved briefly then hidden.
- On retryable failure, a Retry button appears and dispatches
  `retry`.
- On domain failure, a localized message keyed by `error.code` is
  shown; retry is not offered.
- Locale switch changes labels, error messages, and the decimal
  separator without losing buffer state.
- Number formatting follows contract §5.5 (up to 15 significant
  digits, scientific notation for extreme magnitudes) via a small
  helper that wraps `Intl.NumberFormat`.

## Edge cases

- Very long results are formatted with scientific notation and
  remain fully readable via `aria-label` and tooltip.
- Rapid clicks on `=` do not enqueue extra requests (state model
  guards; UI must not bypass).
- Long-press or auto-repeat keyboard input for digits does not
  produce more than one dispatch per keydown/key-repeat event as
  handled by the browser default; no custom throttling.

## Tests

- Component tests with `@testing-library/react` and `userEvent`.
- One test per key type (digit, decimal, operator, sqrt, sign,
  clear, backspace, equals, retry).
- Keyboard mapping test that dispatches key events on the root
  element.
- i18n parity assertion for the calculator key set (verifies every
  key exists in every locale).
- Snapshot-free accessibility assertion (query by role, name).
- Number formatting tests for representative magnitudes.

## Validation

```bash
pnpm --filter @calculator/web format:check
pnpm --filter @calculator/web lint
pnpm --filter @calculator/web stylelint
pnpm --filter @calculator/web typecheck
pnpm --filter @calculator/web i18n:check
pnpm --filter @calculator/web test
pnpm --filter @calculator/web build
pnpm validate
git diff --check
```

## Documentation impact

- Update `apps/web/src/features/calculator/` README (if present) with
  the composition and key-map summary.

## Stop conditions

- A required visual behavior cannot be expressed via existing theme
  tokens without introducing a hard-coded value.
- A UI library dependency would be required.
- The state model lacks an action needed for a required behavior
  (stop; T-006 gap).

## Completion report

- Files added or modified; keyboard/mouse coverage matrix; i18n
  parity output; validation output; explicit confirmation: no
  arithmetic in components, no hard-coded strings, no new
  dependencies.
