# T-002 — Implement the Go calculator arithmetic domain

- **Status**: Ready (T-001 independent reviews reconciled 2026-07-14; contract corrections landed)
- **Depends on**: T-001 (accepted contract; independent reviews reconciled)
- **Owner**: Thiago (implementer TBD)

## Objective

Implement the pure Go arithmetic domain that realizes every operation
and every numeric rule in the accepted contract, with zero HTTP
knowledge and comprehensive table-driven tests.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), especially
  §3 Operation table, §4 Operation semantics and edge cases, §5
  Numeric policy, §10 Go domain boundary.
- [`docs/architecture.md`](../architecture.md) (Principles).
- [`docs/what-not-to-do.md`](../what-not-to-do.md).
- [`apps/api/README.md`](../../apps/api/README.md).

## Context

The domain package currently does not exist. `apps/api/cmd/server`
is a boundary placeholder. This task creates the first real package
under `apps/api/internal/calculator` and its tests.

## Accepted decisions

The contract governs; do not reopen. In particular:

- The seven operations, their arities, and their edge cases (§3, §4).
- `float64` on the wire and in the domain; finite values only (§5.1,
  §5.2).
- Zero normalization to `+0` for successful zero-valued results and
  for zero operands echoed to the wire (§5.4).
- Distinct `math_domain` and `numeric_overflow` errors (§5.2, §8).
- Public shape from §10: `type Operation string`, operation
  constants, `func Calculate(op Operation, operands []float64) (float64, error)`,
  classifiable sentinel/typed errors compatible with `errors.Is`.
- Forbidden internals from §10 and repository policy: service structs
  without state, interfaces without multiple implementations, plugin
  registries, DI containers.

## Scope

- Package `apps/api/internal/calculator`:
  - operation identifiers and constants;
  - arity metadata (per operation);
  - `Calculate` entry point;
  - per-operation arithmetic;
  - domain sentinel/typed errors;
  - finite-value checks;
  - zero normalization helper (exported enough for the HTTP layer to
    reuse for echoed operands, or exported via a small helper such as
    `NormalizeZero(x float64) float64`);
  - table-driven tests for every rule in contract §4 and every code
    in §8 that the domain can raise.
- May add `doc.go` for the package overview.

## File scope

Permitted paths:

- `apps/api/internal/calculator/*.go`
- `apps/api/internal/calculator/*_test.go`
- `apps/api/internal/calculator/doc.go`

Not permitted:

- `apps/api/internal/httpapi/**` (belongs to T-003).
- `apps/api/cmd/server/**` (belongs to T-004).
- Any file outside `apps/api/`.
- Adding Go module dependencies.

## Out of scope

- HTTP handling, decoding, encoding.
- Server lifecycle.
- Frontend code.
- Documentation edits outside package-local `doc.go` and this task's
  self-review checklist.

## Required implementation

1. Define `type Operation string` and exported constants
   (`OpAdd`, `OpSubtract`, `OpMultiply`, `OpDivide`, `OpPower`, `OpSqrt`,
   `OpPercentage`).
2. Define arity: a private table or per-operation switch used both by
   `Calculate` and by tests.
3. Define exported sentinel errors:
   - `ErrUnsupportedOperation`
   - `ErrInvalidOperands` (used for arity or shape violations the
     domain can detect; HTTP layer maps to `invalid_operands`)
   - `ErrDivisionByZero`
   - `ErrMathDomain`
   - `ErrNumericOverflow`
   Each must be an unexported concrete type or a `var … = errors.New(…)`
   sentinel, compatible with `errors.Is`. Wrapping via `%w` is
   permitted; unwrapping must still classify.
4. Implement `Calculate(op Operation, operands []float64) (float64, error)`:
   - unknown `op` → `ErrUnsupportedOperation`;
   - operand count mismatch → `ErrInvalidOperands`;
   - non-finite operand (`NaN`, `±Inf`) → `ErrInvalidOperands`
     (defense-in-depth; the HTTP layer will typically reject these
     earlier);
   - per-operation math per contract §4;
   - **operation-specific domain guards run before invoking the
     underlying floating-point operation.** In particular:
     - `sqrt`: reject negative operands as `ErrMathDomain` before
       calling `math.Sqrt`;
     - `power`: apply the ordering from contract §4.5 — (a)
       `base < 0` and non-integer exponent → `ErrMathDomain`;
       (b) `base == 0` (positive or negative zero) and `exponent < 0`
       → `ErrMathDomain`. Only after these guards may `math.Pow` be
       invoked. This is required because `math.Pow(0, y)` for finite
       `y < 0` returns `+Inf`, which would otherwise be misclassified
       as `ErrNumericOverflow`.
   - Only after the guards permit the call, non-finite result
     classification applies:
     - `+Inf`/`-Inf` from finite inputs (e.g. `1e200 * 1e200`,
       `power(10, 1000)`) → `ErrNumericOverflow`;
     - an unexpected `NaN` from an otherwise unguarded real-domain
       case → `ErrMathDomain` (every known domain case must be
       guarded explicitly above);
   - **Integer-exponent predicate for `power`**: the exponent `y` is
     integer iff `math.Trunc(y) == y` (equivalently
     `math.Trunc(y) == y && !math.IsInf(y, 0)` given finite
     operands). This is exact float64 classification, not
     tolerance-based: `3.0` is integer; `3.0000000000000004` is not.
     At magnitudes where binary64 cannot represent adjacent integers
     (`|y| ≥ 2^53`), the represented value is still classified by
     this predicate; the result remains subject to overflow checks.
     This predicate is fixed by contract §4.5; T-002 must implement
     it verbatim and must not substitute a tolerance-based test.
   - successful zero result normalized to `+0` via
     `NormalizeZero` (contract §5.4). Note IEEE-754 defines
     `math.Sqrt(-0) = -0`; the successful sqrt-of-zero path must
     therefore normalize before returning.
5. Provide a helper `NormalizeZero(x float64) float64` (or equivalent)
   the HTTP layer can call for echoed operands.

## Required behavior

Every example in contract §4 must be reproducible from tests without
modification:

- `add([1, 2]) == 3`
- `subtract([0, 5]) == -5`
- `multiply([1e200, 1e200]) → ErrNumericOverflow`
- `divide([10, 4]) == 2.5`
- `divide([1, 0]) → ErrDivisionByZero`
- `divide([1, -0.0]) → ErrDivisionByZero`
- `divide([1e308, 1e-308]) → ErrNumericOverflow`
- `sqrt([0]) == +0`; `sqrt([-1]) → ErrMathDomain`;
  `sqrt([2]) == 1.4142135623730951`
- `percentage([200, 15]) == 30`
- `percentage([-40, 25]) == -10`
- `percentage([1e300, 1e10]) → ErrNumericOverflow`
- `power([0, 0]) == 1`
- `power([-2, 3]) == -8`; `power([-2, 2]) == 4`
- `power([-2, 0.5]) → ErrMathDomain`
- `power([2, -2]) == 0.25`
- `power([0, -1]) → ErrMathDomain`
- `power([10, 1000]) → ErrNumericOverflow`

## Edge cases

- `-0` inputs are equivalent to `0` for domain logic; observable
  successful zero outputs are `+0`.
- `add([1e308, 1e308]) → ErrNumericOverflow`.
- `power` with a very small negative exponent that yields subnormal
  but finite results is a success; the result is returned unchanged.
- Integer-valued exponents are classified by the predicate
  `math.Trunc(y) == y` (contract §4.5). `2.0` is integer; the next
  representable float64 above `2.0` is not. The test is fixed by the
  contract; the implementer does not choose it.
- `Calculate(OpAdd, nil)` and `Calculate(OpAdd, []float64{1})` →
  `ErrInvalidOperands`.
- Unknown operation string → `ErrUnsupportedOperation`; empty string
  is treated as unknown.

## Tests

- `_test.go` files use Go's standard `testing` package. Prefer
  table-driven tests with `t.Run` subtests keyed by a stable name.
- One table per operation covering ordinary, boundary, and error
  cases from contract §4.
- Explicit tests for zero normalization (both a helper unit test and
  end-to-end via `Calculate`).
- Explicit tests for `errors.Is` classification for each sentinel.
- Explicit tests for arity mismatches per operation.
- No benchmarks required; permitted if trivial and stable.

## Validation

From `apps/api/`:

```bash
test -z "$(gofmt -l .)"
go vet ./...
go test ./internal/calculator/...
go test -race ./internal/calculator/...
go build ./...
```

From repo root:

```bash
git diff --check
```

## Documentation impact

- Package `doc.go` summarizing the domain boundary. No changes to
  `README.md`, `docs/architecture.md`, or the accepted contract in
  this task. The contract already documents public behavior.

## Stop conditions

- The contract and this task's rules directly contradict.
- Implementation would require touching files outside the permitted
  file scope.
- A behavior in contract §4 cannot be represented without a new
  dependency.
- The repository is in an unexpected state that prevents package
  creation (e.g., a prior task's WIP files present).

## Completion report

Report:

- files added;
- test summary (pass counts per operation);
- validation output;
- any local design choices (helper names, private types) and their
  justification;
- explicit confirmation: no HTTP imports; no new Go dependencies; no
  changes to other packages.
