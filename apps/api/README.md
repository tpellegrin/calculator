# `apps/api`

Go workspace for the Calculator HTTP API.

This directory contains the Go implementation of the Calculator HTTP API.
The implementation follows the accepted contract in
[`docs/calculator-contract.md`](../../docs/calculator-contract.md).

## Module

```
module calculator/apps/api
```

The module path is a temporary, clearly replaceable local name. It will
be renamed to the real remote path (e.g., `github.com/<owner>/calculator/apps/api`)
once that path is known.

## Planned package boundaries

```
apps/api/
├── cmd/
│   └── server/          # HTTP server entry point
└── internal/
    ├── calculator/      # Pure arithmetic domain, no HTTP awareness
    └── httpapi/         # HTTP transport, decoding, encoding, status mapping
```

- `internal/calculator` — arithmetic operations, operand validation,
  numeric policy, domain errors. **Independent of HTTP.**
- `internal/httpapi` — request decoding, response encoding, HTTP status
  mapping, handler wiring. **No arithmetic here.**
- `cmd/server` — composes `httpapi` handlers and starts the HTTP server.

See package doc comments (`internal/*/doc.go`) for the intent of each
package.

## Validation

From `apps/api/`:

```bash
# Validate formatting (read-only)
test -z "$(gofmt -l .)"

# Static analysis and build
go vet ./...
go build ./...
go test ./...

# To automatically fix formatting:
# go fmt ./...
```

The `cmd/server` binary starts the HTTP API server. It reads `PORT` from
the environment (default `8080`), composes the `httpapi` handlers, and
performs graceful shutdown on `SIGINT`/`SIGTERM`.

## Running

From `apps/api/`:

```bash
go run ./cmd/server
```

### Configuration

| Variable | Default | Description                       |
| -------- | ------- | --------------------------------- |
| `PORT`   | `8080`  | TCP port to listen on (1–65535).  |

## Not present yet

- Persistence (no database is planned)
- Authentication (no auth is planned)
- Runtime fake responses
- Client SDKs generated from the API

## Next tasks

Runtime implementation is broken into three bounded tasks against the
accepted contract: the Go arithmetic domain (`internal/calculator`), the
Go HTTP boundary (`internal/httpapi`), and the server lifecycle
(`cmd/server`). See [`docs/tasks/`](../../docs/tasks/README.md).
