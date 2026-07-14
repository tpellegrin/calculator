# T-002 Go Calculator Domain Review

- **Reviewer:** Junie (Claude Opus 4-7 session, 2026-07-14)
- **Review type:** Independent implementation review
- **Reviewed task:** [`docs/tasks/T-002-implement-go-calculator-domain.md`](../tasks/T-002-implement-go-calculator-domain.md)
- **Verdict:** PASS WITH CORRECTIONS

## Scope reviewed

- Package files under `apps/api/internal/calculator/`:
  - `doc.go` (package overview, adjusted by the implementer)
  - `operation.go` (`Operation` type, seven constants, private `arity` map)
  - `errors.go` (five exported sentinel errors)
  - `calculator.go` (`Calculate`, `NormalizeZero`)
  - `calculator_test.go` (`TestCalculate`, `TestNormalizeZero`, `TestSentinelErrors`)
- Task status change to `Implemented` in `docs/tasks/T-002-implement-go-calculator-domain.md`.
- Working-tree state via `git status --short`, `git diff`, `git diff --cached`, `git log -1 --stat`.
- Authoritative documents: `docs/calculator-contract.md`, `docs/tasks/T-001-*.md`,
  `docs/tasks/T-002-*.md`, `docs/architecture.md`, `docs/implementation-guide.md`,
  `docs/delivery-workflow.md`, `docs/ai-change-checklist.md`, `docs/what-not-to-do.md`,
  `apps/api/README.md`, `apps/api/go.mod`, `AGENTS.md`, `README.md`.

## Implementation strengths

- Public surface matches contract §10 exactly: `type Operation string`, the seven
  constants (`OpAdd`, `OpSubtract`, `OpMultiply`, `OpDivide`, `OpPower`, `OpSqrt`,
  `OpPercentage`) with the accepted string values, `Calculate(op Operation,
  operands []float64) (float64, error)`, and `NormalizeZero(float64) float64`.
- Five sentinel errors created via `errors.New`; classifiable through `errors.Is`
  without string parsing; no HTTP status codes or user-facing messages embedded.
- Validation ordering follows the contract exactly: supported operation → arity →
  operand finiteness → operation-specific domain guards → arithmetic → post-hoc
  non-finite classification → `NormalizeZero`.
- Operation-specific structural guards run *before* `math.Sqrt` and `math.Pow`:
  - `sqrt`: `operands[0] < 0` rejected before `math.Sqrt` (so negative zero is
    not treated as negative and produces `+0` via `NormalizeZero`).
  - `power`: negative base with non-integer exponent, and zero base with negative
    exponent, both rejected before `math.Pow`. This preserves the required
    distinction between `math_domain` and `numeric_overflow`.
- Integer-exponent predicate is exact: `math.Trunc(exponent) == exponent`. No
  tolerance/epsilon. `3.0` classifies as integer; `3.0000000000000004` does not.
- `divide` treats both `+0` and `-0` as `ErrDivisionByZero` (Go `x == 0` covers
  both).
- `NormalizeZero` correctly maps `-0` to `+0` while leaving all non-zero values
  unchanged (relies on Go's `0 == -0` equality, and returns the literal `0`).
- Package is pure: no imports of `net/http`, `encoding/json`, transport, or
  persistence concerns. `go.mod` was not modified; no new dependencies.
- No service struct with no state, no plugin registry, no interface without
  multiple implementations, no mutable global state (only a read-only `arity`
  map).
- Non-finite operand defence-in-depth: `NaN`, `+Inf`, `-Inf` all rejected as
  `ErrInvalidOperands`; no successful non-finite result can escape.

## Blockers

None.

## Major findings

None.

## Minor findings

### F1 — Unnecessary tolerance for `sqrt(2)` assertion

- **Severity:** Minor
- **Location:** `apps/api/internal/calculator/calculator_test.go`, `sqrt fractional` case (pre-correction).
- **Finding:** The test asserted `sqrt(2) == 1.4142135623730951` via a
  `useTolerance: true, tolerance: 1e-15` branch. `math.Sqrt(2)` is deterministic
  and the contract fixes the exact float64 literal; a tolerance-based check
  weakens the assertion and hides potential bit-identity regressions.
- **Why it matters:** The review guide explicitly calls out "excessive tolerance"
  as a weak-test smell. Contract §4.3 pins the exact value.
- **Required correction:** Compare `sqrt(2)` for bit equality against the exact
  literal.

### F2 — Arity coverage limited to `OpAdd`

- **Severity:** Minor
- **Location:** `apps/api/internal/calculator/calculator_test.go` validation block (pre-correction).
- **Finding:** Only `OpAdd` had explicit "too few / too many / nil" arity tests.
  T-002 §Tests requires "arity mismatches per operation". A regression that only
  affected `OpSqrt`'s unary contract or `OpPower`'s binary contract could pass.
- **Why it matters:** Arity is one of the two contract-visible rejection classes
  handled entirely by the domain; unary vs. binary regressions must be prevented.
- **Required correction:** Add representative arity-mismatch cases across
  `OpSqrt`, `OpDivide`, `OpPower`, `OpPercentage`, including a two-operand call
  to `OpSqrt` (the only unary operation).

### F3 — Missing `-Inf` operand case

- **Severity:** Minor
- **Location:** `apps/api/internal/calculator/calculator_test.go` non-finite operand block (pre-correction).
- **Finding:** Direct-call finiteness was verified for `NaN` and `+Inf` only.
- **Why it matters:** The finite-operand guard is a single conditional
  (`math.IsInf(v, 0) || math.IsNaN(v)`); asserting the `-Inf` branch prevents
  a future refactor from silently accepting negative infinity.
- **Required correction:** Add a `-Inf` operand case that must classify as
  `ErrInvalidOperands`.

### F4 — Zero normalization only exercised via `sqrt`

- **Severity:** Minor
- **Location:** `apps/api/internal/calculator/calculator_test.go` (pre-correction).
- **Finding:** The only end-to-end test of `-0 → +0` normalization on a
  successful arithmetic path was `sqrt(-0)`. `NormalizeZero` is called on every
  arithmetic path, and `-0 + -0 == -0` under IEEE-754, so a regression that
  bypassed `NormalizeZero` on `OpAdd`/`OpMultiply`/`OpSubtract` would not be
  caught.
- **Why it matters:** Contract §5.4 mandates normalization on *every* successful
  result. Signed-zero coverage on non-sqrt paths closes that regression window.
- **Required correction:** Add cases such as `add(-0, -0) → +0`,
  `multiply(-0, 3) → +0`, and `subtract(5, 5) → +0`; each is checked with
  `math.Signbit` via the existing zero-result assertion.

## Test-quality findings

- Table structure carries a stable `name` per case; `t.Run` with named subtests
  is used; failure messages include actual/expected values.
- `errors.Is` is used for every error assertion; no string comparison.
- `math.Signbit` is asserted for zero results (existing invariant at the end of
  the assertion block); after corrections it now covers the added `-0 → +0`
  cases on non-sqrt paths too.
- `TestSentinelErrors` provides a low-cost identity check for the five
  sentinels; combined with `errors.Is` assertions in the table, all classifications
  are exercised.
- No shared mutable test state; no order dependence; no `t.Parallel` racing on
  shared fixtures.

## Corrections applied

All corrections are confined to `apps/api/internal/calculator/calculator_test.go`
(and the completion record). No production code was modified. No new
dependencies. No contract or task-scope decisions were reopened.

1. **F1 fix.** Removed the `useTolerance` / `tolerance` fields and their
   assertion branch; `sqrt(2)` now asserts exact float64 equality against
   `1.4142135623730951`.
2. **F2 fix.** Added per-operation arity cases:
   - `sqrt too many operands` (`[1, 2]` → `ErrInvalidOperands`);
   - `sqrt too few operands` (`nil` → `ErrInvalidOperands`);
   - `divide too few operands` (`[1]` → `ErrInvalidOperands`);
   - `power too many operands` (`[1, 2, 3]` → `ErrInvalidOperands`);
   - `percentage too few operands` (`[50]` → `ErrInvalidOperands`).
3. **F3 fix.** Split the non-finite operand cases into `NaN`, `+Inf`, and
   `-Inf`, all asserted as `ErrInvalidOperands` via `errors.Is`.
4. **F4 fix.** Added zero-normalization coverage on non-sqrt success paths:
   - `add(-0, -0) → +0` (verifies `-0 + -0 = -0` gets normalized);
   - `subtract(5, 5) → +0`;
   - `multiply(-0, 3) → +0`.
   Each is checked by the existing `math.Signbit` assertion when
   `wantResult == 0`.

## Remaining recommendations

- (Non-blocking) Consider a dedicated `signbit_test.go` or a `t.Run("signbit",
  ...)` group named around the invariant; today the check is a trailing
  assertion inside the generic loop. Not required by T-002 and not applied.
- (Non-blocking) A benchmark for `Calculate` is permitted by T-002 but not
  required; none was added.

## Validation

Run from `apps/api/`:

| Command                                        | Result |
| ---------------------------------------------- | ------ |
| `test -z "$(gofmt -l .)"`                      | PASS   |
| `gofmt -w internal/calculator/*.go`            | PASS (no changes needed after edits) |
| `go vet ./...`                                 | PASS   |
| `go test ./internal/calculator`                | PASS   |
| `go test -race ./internal/calculator`          | PASS   |
| `go test ./...`                                | PASS (only `internal/calculator` has tests) |
| `go test -race ./...`                          | PASS   |
| `go build ./...`                               | PASS   |

Run from repository root:

| Command             | Result |
| ------------------- | ------ |
| `git diff --check`  | PASS (no whitespace errors) |
| `git status --short` | Shows expected modifications only |

Test count after corrections: `TestCalculate` runs 44 subtests (all pass);
`TestNormalizeZero` runs 4 subtests (all pass); `TestSentinelErrors` runs 1
top-level assertion loop over 5 sentinels (all pass). `-race` clean.

## Final verdict rationale

The T-002 implementation is contract-compliant and idiomatic Go:

- The public surface matches contract §10.
- Validation ordering matches contract §5.2 and §4.5 exactly, including the
  explicit `power` domain guards required *before* `math.Pow`.
- The integer-exponent predicate is exact (`math.Trunc(y) == y`); the
  near-integer case is covered.
- Zero normalization is centralized and applied on every successful path.
- Error sentinels are classifiable via `errors.Is` without string parsing; no
  HTTP concerns leaked in.
- Test coverage was strong for all seven operations, all error classes, both
  signed-zero divisors, sqrt of negative and negative-zero, and the power
  edge-case matrix from contract §4.5 (including `3.0000000000000004`).

Four minor test-quality gaps were closed in place per the correction policy
(unnecessary tolerance, per-operation arity, `-Inf` operand, signed-zero
normalization on non-sqrt paths). All corrections are confined to
`apps/api/internal/calculator/calculator_test.go`; no new dependencies, no
scope creep, no contract or product-decision changes.

Verdict: **T-002 REVIEW PASSED WITH CORRECTIONS.**
