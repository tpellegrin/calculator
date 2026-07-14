# T-004 — Implement the Go server lifecycle

- **Status**: Draft (blocked on T-001 reviews and T-003)
- **Depends on**: T-001, T-002, T-003
- **Owner**: Thiago (implementer TBD)

## Objective

Turn `apps/api/cmd/server` into a real HTTP server that composes the
handler from `internal/httpapi`, reads `PORT`, applies proportional
timeouts, recovers from panics, logs proportionately, and shuts down
gracefully — with no CORS and no static asset serving.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md) §12.1.
- [`docs/architecture.md`](../architecture.md).
- [`apps/api/README.md`](../../apps/api/README.md).

## Context

`apps/api/cmd/server/main.go` is currently a placeholder that
compiles and exits.

## Accepted decisions

- `PORT` (default `8080`).
- Proportional `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`,
  `IdleTimeout` (seconds, not minutes).
- Panic recovery middleware wrapping the router.
- Graceful shutdown on `SIGINT`/`SIGTERM`.
- No CORS.
- No static frontend serving unless required by T-011.
- Structured logging via `log/slog` (Go stdlib) — no new dependency.
  Info-level logs must not include full request bodies or operand
  values; include operation identifier and error code only.

## Scope

- `apps/api/cmd/server/main.go` and adjacent private files under
  `apps/api/cmd/server/`.
- May add `apps/api/cmd/server/*_test.go` for startup/shutdown tests
  where proportionate (e.g., server starts, `/healthz` responds,
  server shuts down on signal within a bounded time).

## File scope

Permitted:

- `apps/api/cmd/server/*.go`
- `apps/api/cmd/server/*_test.go`

Not permitted:

- `apps/api/internal/**` changes.
- New Go module dependencies.

## Out of scope

- Serving static assets (deferred to T-011 if that task is executed).
- CORS.
- Metrics or tracing.

## Required implementation

1. Read `PORT` from env, default `8080`; validate as a numeric port
   (1–65535); on invalid, log and exit non-zero.
2. Compose the top-level `http.Handler` from `internal/httpapi`.
3. Wrap with:
   - a panic-recovery middleware that logs and returns
     `500 internal_error` (using `httpapi`'s error encoder if
     exported, otherwise a minimal envelope);
   - a request-log middleware at info level with method, path,
     status, duration, operation (when applicable), error code (when
     applicable). No bodies. No operand values.
4. Configure `http.Server` timeouts (defaults: ReadHeaderTimeout 5s,
   ReadTimeout 10s, WriteTimeout 10s, IdleTimeout 60s) — implementer
   may adjust within the same order of magnitude.
5. Start via `ListenAndServe`; on error other than
   `http.ErrServerClosed`, log and exit non-zero.
6. Signal handling: on `SIGINT`/`SIGTERM`, call `server.Shutdown`
   with a bounded timeout (10s). Return `0` on clean shutdown.

## Required behavior

- `PORT=0` (test): server binds to an ephemeral port; `/healthz`
  returns `200`.
- Unset `PORT`: server binds to `:8080` (may be asserted by inspection
  in test, not a live bind).
- Panic in a handler → response is a 500 with `error.code =
  internal_error` and `Content-Type: application/json; charset=utf-8`;
  the process does not crash.
- Sending `SIGTERM` to the server initiates shutdown; in-flight
  requests complete within the shutdown budget.

## Edge cases

- `PORT` set to a non-numeric value → clean exit with clear log.
- Concurrent requests during shutdown are allowed to finish or receive
  a graceful error; new connections are refused.
- Multiple `SIGTERM` in rapid succession do not double-close.

## Tests

- A `TestMain` or focused test binds to `:0`, hits `/healthz`, and
  exercises graceful shutdown via `context.WithTimeout` and
  `server.Shutdown`.
- A panic-recovery test that mounts a handler which panics behind the
  recovery middleware and asserts a 500 with the envelope.

## Validation

From `apps/api/`:

```bash
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go test -race ./cmd/server/...
go build ./...
```

## Documentation impact

- Update `apps/api/README.md` to describe the run command
  (`go run ./cmd/server`), the default port, and the `PORT` env var.

## Stop conditions

- The behavior requires a new dependency.
- Contract and this task appear to conflict.
- `internal/httpapi` does not export enough surface to wire the
  server without change (stop; T-003 gap).

## Completion report

- Files added; validation output; observed shutdown timings; explicit
  confirmation: no CORS, no static assets, no dependency additions.
