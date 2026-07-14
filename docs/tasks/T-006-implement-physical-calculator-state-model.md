# T-006 — Implement the physical-calculator state model

- **Status**: Ready
- **Depends on**: T-001, T-005
- **Owner**: Thiago (implementer TBD)

## Objective

Implement the calculator's frontend state machine — separate from any
visual composition — that owns input composition, operator selection,
equals submission, backend chaining, cancellation, and stale-response
protection, per contract §14 and §16.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), §14, §15,
  §16, §17, §5.4, §5.5.
- Existing i18n utilities under `apps/web/src/i18n/` (for locale-aware
  decimal separator).
- `apps/web/src/api/` types added by T-005.

## Context

The state model is the boundary between user input and backend
submission. It exists independently of any React components; the UI
in T-007 consumes it via a hook or store.

## Accepted decisions

- String-based input buffer for the current operand under composition.
- Locale-aware decimal separator on input; canonical `.` on the wire.
- Explicit equals-driven atomic submission; one request per `=`.
- Backend result seeds chaining as the first operand of the next
  atomic request.
- No local arithmetic, ever.
- No repeated-`=` replay, no history, no expression parsing.
- Cancellation via `AbortController` and stale-response suppression
  via a monotonic sequence token.
- `C` clears all state; `⌫` removes one character from the current
  buffer.

## Scope

- New folder `apps/web/src/features/calculator/state/` with:
  - a pure reducer or state machine (framework-neutral core);
  - a React hook (e.g. `useCalculator()`) that wires the reducer to
    `calculate()` from `apps/web/src/api/`;
  - dispatchable actions covering: digit, decimal, sign toggle,
    operator, unary sqrt, percentage, equals, backspace, clear,
    retry, cancel;
  - narrow selectors: `displayValue`, `previousResult`, `status`
    (`idle | pending | success | retryable | domain-error`), `error`,
    `canRetry`.
- Focused unit tests for reducer transitions and the hook's async
  behavior (using `@testing-library/react` and fake timers where
  appropriate).

## File scope

Permitted:

- `apps/web/src/features/calculator/state/**`
- Corresponding test files.

Not permitted:

- Visual components under `apps/web/src/features/calculator/` outside
  `state/` (owned by T-007).
- `apps/web/src/api/**` (owned by T-005; if a gap is discovered,
  stop and escalate).
- Any file under `apps/api/**`.
- Adding an npm dependency.

## Out of scope

- Rendering, styling, theme tokens.
- Global app shell wiring (owned by T-008).
- Real-server integration tests (T-009).

## Required implementation

1. Reducer with a discriminated-union `State` and `Action`. Include:
   - `entry`: `{ buffer: string, pendingResult: number | null }`
     during composition;
   - `binary`: `{ left: number, op: Operation, buffer: string }`
     during second-operand composition;
   - `unarySqrtPending`: composing a single operand for `sqrt`;
   - `submitting`: awaiting backend response; carries `sequence` and
     `abortController`;
   - `success`: `{ result: number }` after a successful submission;
   - `retryableFailure`: network or `internal_error`;
   - `domainFailure`: `{ code: ApiErrorCode }` for other API errors.
2. Actions:
   - `digit(d: 0..9)`, `decimal()`, `signToggle()`, `backspace()`,
     `clear()`;
   - `operator(op: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percentage')`;
   - `unarySqrt()`;
   - `equals()`;
   - `retry()`;
   - `resultReceived(sequence, result)`;
   - `errorReceived(sequence, kind, code?)`.
3. Rules:
   - `operator` after a successful result composes a new binary from
     the previous result;
   - `equals` requires the current state to be a well-formed
     submission (binary with both operands, or `unarySqrtPending`
     with a single operand);
   - `equals` submits one atomic request and increments `sequence`;
   - stale responses (sequence mismatch) are ignored;
   - `clear` resets to the initial `entry` state and aborts any
     in-flight request;
   - `retry` re-submits the same inputs after `retryableFailure`
     only;
   - `domainFailure` preserves the previous inputs so the user can
     correct them;
   - `success` becomes the seed operand for the next binary.
4. Input composition:
   - `digit` appends to the current buffer, respecting the locale's
     decimal separator display but always producing canonical
     `float64`-parseable strings for submission;
   - `decimal` inserts the decimal separator once;
   - `signToggle` flips a leading `-` on the buffer without touching
     the last submitted result;
   - `backspace` removes one glyph from the buffer; if the buffer
     becomes empty in `binary` state, revert to `entry` with the
     left operand echoed to the display.
5. The hook exposes state and dispatchers, subscribes to backend
   completion via the `calculate()` promise, and cancels superseded
   submissions.

## Required behavior

Testable transitions:

- `1 + 2 =` submits `{operation:"add", operands:[1,2]}`.
- Chaining: after the previous returns `3`, `× 4 =` submits
  `{operation:"multiply", operands:[3,4]}`.
- `√ =` after `9` in `unarySqrtPending` submits
  `{operation:"sqrt", operands:[9]}`.
- `%` is a binary operator: `200 % 15 =` submits
  `{operation:"percentage", operands:[200,15]}`.
- Repeated `=` after success does not trigger a new request.
- `C` in any state resets and aborts an in-flight submission with an
  intentional-abort signal that is not surfaced as a user error.
- A slow request superseded by a fresh `=` produces no visible error
  for the aborted one; the newer response wins.
- Locale switch between `en-US` and `pt-BR` swaps the displayed
  decimal separator without changing the internal buffer semantics.

## Edge cases

- Multiple leading zeros collapse (`00.5` displays as `0.5`).
- Buffer of only `-` or only `.` is not a valid operand; `=` is a
  no-op or dispatches an `invalid_operands`-like local pre-check
  message keyed by an existing `ApiErrorCode` (do not invent codes).
- Buffer exceeds a sensible input length (e.g., 32 characters);
  further digits are ignored.
- Network failure during a chain preserves the last successful result
  as "previous" while the current submission is `retryableFailure`.

## Tests

- Vitest reducer unit tests: pure state transitions.
- `@testing-library/react` hook tests: mocked `calculate()` with
  controllable promise resolution to verify pending/success/failure
  and stale-response suppression.
- Explicit tests for `C` aborting in-flight and not surfacing errors.
- Locale tests for decimal separator behavior.

## Validation

```bash
pnpm --filter @calculator/web format:check
pnpm --filter @calculator/web lint
pnpm --filter @calculator/web typecheck
pnpm --filter @calculator/web test
pnpm validate
git diff --check
```

## Documentation impact

- A brief README under `apps/web/src/features/calculator/` (or
  reuse an existing one) describing the state model shape.

## Stop conditions

- The contract lacks a rule needed to disambiguate a state
  transition.
- The state model would need to invoke arithmetic locally to satisfy
  a required behavior.
- A new dependency would be required.

## Completion report

- Files added; state chart summary; test list; validation output;
  explicit confirmation: no arithmetic, no new dependency, no
  visual components introduced.
