# T-004 Go Server Lifecycle Review

- **Reviewer:** claude-opus-4-7 (independent review pass)
- **Review type:** Independent implementation review with bounded corrections
- **Reviewed task:** [`docs/tasks/T-004-implement-go-server-lifecycle.md`](../tasks/T-004-implement-go-server-lifecycle.md)
- **Verdict:** PASS WITH CORRECTIONS

## Scope reviewed

Files added or modified under T-004:

- `apps/api/cmd/server/main.go` — reduced to a thin shell that calls `Run`.
- `apps/api/cmd/server/run.go` — new: configuration, listener acquisition,
  server construction, signal handling, graceful shutdown, request-log and
  panic-recovery middlewares.
- `apps/api/cmd/server/run_test.go` — new: unit tests for configuration,
  lifecycle, and middleware behavior.
- `apps/api/README.md` — documents `PORT` and how to run the server.
- `docs/tasks/T-004-implement-go-server-lifecycle.md` — status flipped to
  `Implemented`.

No files outside T-004's file scope were changed (`apps/api/internal/**`
and `apps/api/go.mod` are untouched, and no `apps/web/**` file is
affected).

## Implementation strengths

- Uses `signal.NotifyContext` with `SIGINT` and `SIGTERM` and defers
  `stop`.
- `http.Server` is explicit; the default `http.DefaultServeMux` is not
  used.
- All four T-004 timeout fields are populated in seconds
  (`ReadHeaderTimeout=5s`, `ReadTimeout=10s`, `WriteTimeout=10s`,
  `IdleTimeout=60s`).
- Shutdown uses a fresh, bounded `context.WithTimeout` (not the
  already-cancelled signal context).
- `http.ErrServerClosed` is compared via `errors.Is`, not string
  matching.
- `main` is a thin shell: it calls `Run`, prints the wrapped error, and
  exits non-zero. No deferred functions bypassed by `os.Exit`.
- Structured logging uses `log/slog` (stdlib) — no new dependency.
- Panic recovery emits `error.code = internal_error`, HTTP 500,
  `Content-Type: application/json; charset=utf-8`, matching the
  contract.
- No CORS, no static asset serving, no metrics/tracing — matches
  "Out of scope".

## Blockers

None.

## Major findings

### M-1 — Serve goroutine could leak; concurrent Serve errors could be lost after Shutdown

- **Severity:** Major
- **Location:** `apps/api/cmd/server/run.go` (previous `Run`)
- **Finding:** The previous implementation started a goroutine that
  only sent to `errCh` when `Serve` returned a non-`ErrServerClosed`
  error. On the signal path, `Run` called `srv.Shutdown(...)` and
  returned immediately — it never waited for the serve goroutine to
  exit and never drained `errCh`. In practice `Serve` will return
  `ErrServerClosed` right after `Shutdown`, but:
  1. There is a small window where `Run` can return before `Serve`
     has actually returned; the listener/goroutine are then
     technically still live at the moment the caller observes
     completion.
  2. If `Serve` returned a genuine terminal error *concurrently* with
     shutdown (e.g., a listener failure that races with signal
     delivery), that error would be silently discarded.
- **Why it matters:** Deterministic goroutine termination and error
  precedence are core lifecycle requirements. The reviewer prompt
  explicitly calls out both "lifecycle returns before consuming a
  goroutine result" and "serve goroutine can block forever on an
  unbuffered error channel" — the second was not the case here, but
  the first was.
- **Required correction:** Have the serve goroutine always send exactly
  one value (nil for `ErrServerClosed`, otherwise the error), and have
  the shutdown branch wait for that value before returning. Report
  shutdown errors with precedence over serve errors.
- **Disposition:** Corrected.

### M-2 — Lifecycle test scraped JSON logs from a temp file with polling

- **Severity:** Major (test quality / reliability)
- **Location:** `apps/api/cmd/server/run_test.go` (previous
  `TestRun_LifecycleAndHealthz`)
- **Finding:** The test wrote stderr to a temp file, then polled the
  file every 100 ms up to 5 s trying to `strings.Contains(..., "starting
  server")` and parse JSON out of a log line to discover the bound
  address. This is brittle: it depends on the exact log field name,
  couples the test to the logging format, and relies on wall-clock
  sleeps.
- **Why it matters:** The reviewer prompt explicitly flags "tests rely
  on sleeps rather than synchronization", "arbitrary sleeps", and
  "tests that bypass the actual lifecycle path". The test also bound to
  port 0 through `PORT=0`, which required round-tripping the address
  through the logger.
- **Required correction:** Introduce a package-private seam
  (`runWithListener`) that accepts a pre-bound `net.Listener`. Tests
  call `net.Listen("tcp", "127.0.0.1:0")` themselves, know the address
  immediately from `ln.Addr()`, and exercise the same lifecycle code
  path as `Run` (which now simply constructs a listener and delegates
  to `runWithListener`).
- **Disposition:** Corrected.

## Minor findings

### m-1 — `Run` signature used `*os.File` instead of `io.Writer`

- **Severity:** Minor
- **Location:** `apps/api/cmd/server/run.go`
- **Finding:** `Run(ctx, stdout, stderr *os.File, ...)` unnecessarily
  narrowed the stream type. `io.Writer` is idiomatic and makes tests
  cleaner (they can pass `io.Discard` or a `bytes.Buffer`).
- **Why it matters:** Idiomatic Go; simplifies testing without changing
  behavior.
- **Required correction:** Widen both parameters to `io.Writer`. `main`
  still passes `os.Stdout` / `os.Stderr`.
- **Disposition:** Corrected.

### m-2 — `stdout` parameter is unused

- **Severity:** Minor
- **Location:** `apps/api/cmd/server/run.go`
- **Finding:** `stdout` is accepted but never written to.
- **Why it matters:** Signals dead API surface to readers.
- **Required correction:** Documented as reserved for future
  operator-facing output (e.g., readiness probes) and explicitly
  suppressed with `_ = stdout` so intent is clear. Kept in signature so
  `main`'s wiring does not need to change again later.
- **Disposition:** Corrected (documented + suppressed).

### m-3 — `errCh` receive after `Shutdown` used `select`-less blocking read

- **Severity:** Minor (subsumed by M-1)
- **Location:** `apps/api/cmd/server/run.go`
- **Finding:** After correction, `serveErrCh` is buffered (cap 1) and
  always receives exactly one value; the shutdown path performs a
  single unconditional receive. This can never block indefinitely
  because `srv.Shutdown` guarantees `Serve` returns (either normally
  with `ErrServerClosed` or with the deadline-exceeded error from
  shutdown context) before the goroutine's send.
- **Why it matters:** Confirms M-1 correction is deadlock-free.
- **Disposition:** Corrected.

## Test-quality findings

### t-1 — Coverage gaps around lifecycle branches

- **Severity:** Test quality
- **Location:** `apps/api/cmd/server/run_test.go`
- **Finding:** The previous suite covered configuration and one
  happy-path lifecycle test, plus one recovery-middleware test. It did
  not cover: config error early-return in `Run`, unexpected `Serve`
  errors, or a pre-cancelled parent context.
- **Required correction:** Added:
  - `TestRun_ConfigError` — verifies `Run` returns wrapped error before
    binding.
  - `TestRunWithListener_GracefulShutdownOnCancel` — replacement for
    the previous flaky test; verifies handler wiring via `/healthz`
    and graceful shutdown on context cancellation, on an ephemeral
    listener.
  - `TestRunWithListener_ServeErrorClosesLifecycle` — closes the
    listener to force Serve to return; asserts lifecycle terminates
    without a signal.
  - `TestRunWithListener_PreCancelledContext` — asserts no deadlock
    when the parent context is cancelled before serving begins.
  - `TestRecoveryMiddleware_TypedErrorPanic` — covers the branch where
    the panic value is already an `error`.
  - `TestLoadConfig` extended with `whitespace`, `localhost:8080`, and
    upper-bound cases.
- **Disposition:** Corrected.

### t-2 — Test-wide parallelism / brittleness

- **Severity:** Test quality
- **Location:** `apps/api/cmd/server/run_test.go`
- **Finding:** Tests can now safely use `t.Parallel()` because they
  each own a unique ephemeral listener; there is no shared package
  state and no environment mutation.
- **Disposition:** Corrected.

## Corrections applied

| Finding | File | Correction |
|---|---|---|
| M-1 | `apps/api/cmd/server/run.go` | Serve goroutine always sends exactly one result (nil for `ErrServerClosed`); shutdown path awaits the serve goroutine before returning; shutdown/serve error precedence made deterministic. |
| M-2 | `apps/api/cmd/server/run_test.go` | Replaced log-scraping test with `runWithListener` seam: tests bind their own ephemeral listener and know the address before calling into the lifecycle. |
| m-1 | `apps/api/cmd/server/run.go` | `Run` now takes `io.Writer` for stdout/stderr. |
| m-2 | `apps/api/cmd/server/run.go` | Documented `stdout` as reserved future surface; explicit `_ = stdout`. |
| m-3 | `apps/api/cmd/server/run.go` | Explicit single-value channel discipline documented in code. |
| t-1 | `apps/api/cmd/server/run_test.go` | Added tests for config error, serve error, pre-cancelled context, typed-error panic; broadened `loadConfig` cases. |
| t-2 | `apps/api/cmd/server/run_test.go` | `t.Parallel()` on all tests; no environment mutation. |

## Remaining recommendations

- **Info-level request logging currently includes only `method`, `path`,
  `status`, `duration`.** T-004 says "operation (when applicable), error
  code (when applicable)". These fields are optional per the same
  clause but would improve operational value once T-005 (frontend
  wiring) exercises the API. Not required for T-004 PASS; would need
  a small pass into `internal/httpapi` (out of T-004 scope) to expose
  them cleanly and is therefore *Reported*, not applied.
- Consider tightening `PORT` to reject a leading `+` or leading zeros
  as strictly as the contract prescribes. Current behavior follows
  `strconv.Atoi` semantics, which accepts `+8080` and `08080`. T-004
  does not forbid this. Reported, not applied.

## Official Go sources consulted

- <https://pkg.go.dev/net/http> — `http.Server`, `Server.Serve`,
  `Server.Shutdown`, `http.ErrServerClosed`, timeout fields.
- <https://pkg.go.dev/os/signal> — `signal.NotifyContext` semantics,
  stop function contract.
- <https://pkg.go.dev/context> — `WithTimeout`, cancellation
  propagation.
- <https://pkg.go.dev/net> — `net.Listen`, listener ownership,
  `Addr()`.
- <https://pkg.go.dev/errors> — `errors.Is` for sentinel comparison.
- <https://go.dev/doc/effective_go> — error wrapping and idioms.
- <https://go.dev/wiki/CodeReviewComments> — goroutine and channel
  lifecycle.

Key facts relied on:

1. `Server.Serve` returns `http.ErrServerClosed` after `Shutdown` or
   `Close` — this is the expected termination path and must not be
   surfaced as an error.
2. `Server.Shutdown` closes the listener; further sends by the serve
   goroutine happen exactly once after `Serve` returns.
3. The context passed to `Server.Shutdown` bounds only the graceful
   drain; it must not be the already-cancelled signal context.
4. `signal.NotifyContext`'s returned `stop` must be called to release
   signal handling resources.

## Validation

| Command | Baseline | Final |
| --- | --- | --- |
| `test -z "$(gofmt -l cmd/server/)"` | PASS | PASS |
| `go vet ./...` | PASS | PASS |
| `go test ./cmd/server` | PASS | PASS |
| `go test -race ./cmd/server` | PASS | PASS |
| `go test ./internal/calculator ./internal/httpapi ./cmd/server` | PASS | PASS |
| `go test -race ./...` | PASS | PASS |
| `go test ./...` | PASS | PASS |
| `go build ./...` | PASS | PASS |

`git diff --check` and `git status --short` are clean of formatting
noise; no unrelated files are staged.

## Final verdict rationale

Baseline implementation was functionally close to correct: it constructs
an explicit `http.Server`, sets the required timeouts, wraps the
`httpapi` handler with request-log and recovery middlewares, and uses
`signal.NotifyContext` with a bounded fresh shutdown context. However,
its shutdown path did not wait for the serve goroutine to exit, so
concurrent serve errors could be dropped and goroutine termination was
non-deterministic (M-1); and the primary lifecycle test relied on
scraping JSON log lines out of a polled temp file (M-2). Both are
squarely inside T-004 scope, are objectively supported by official
`net/http` and `os/signal` semantics, and are fixed with bounded,
testable changes that do not touch `apps/api/internal/**` or add
dependencies.

With those corrections applied, T-004's required implementation,
required behavior, edge cases, and validation all pass. Verdict:
**PASS WITH CORRECTIONS**.
