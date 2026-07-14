# `apps/api`

Go workspace for the Calculator HTTP API.

This directory establishes the intended backend boundary. **No arithmetic
domain and no HTTP transport are implemented yet.** The accepted contract
that governs both layers is
[`docs/calculator-contract.md`](../../docs/calculator-contract.md); the
Go domain, HTTP boundary, and server lifecycle are authored as separate
tasks under [`docs/tasks/`](../../docs/tasks/README.md) and follow the
[delivery workflow](../../docs/delivery-workflow.md).

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
│   └── server/          # HTTP server entry point (placeholder today)
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

The placeholder `cmd/server` binary compiles and exits with a message
indicating that server implementation follows in the next task. It does
not open a port, does not register handlers, and returns no canned
responses.

## Not present yet

- HTTP endpoints
- Arithmetic implementation
- Persistence (no database is planned)
- Authentication (no auth is planned)
- Runtime fake responses
- Client SDKs generated from the API

## Next tasks

Runtime implementation is broken into three bounded tasks against the
accepted contract: the Go arithmetic domain (`internal/calculator`), the
Go HTTP boundary (`internal/httpapi`), and the server lifecycle
(`cmd/server`). See [`docs/tasks/`](../../docs/tasks/README.md).
