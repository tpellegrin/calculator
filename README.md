# Calculator

A full-stack calculator built with React, TypeScript, and Go.

## About the project

The application is split into two parts:

- a React frontend responsible for the interface and user interaction;
- a Go service responsible for arithmetic, validation, and API responses.

The frontend talks to the backend over HTTP. Calculation rules live in the Go
domain package rather than being repeated in the browser.

## Project status

The repository structure, frontend foundation, and the physical-calculator
feature are in place.

- The React application lives in `apps/web`.
- The Go workspace lives in `apps/api`.
- The physical-calculator feature lives in `apps/web/src/features/calculator/`.
- The calculator semantics, REST contract, error taxonomy, and interaction
  model are defined in
  [`docs/calculator-contract.md`](./docs/calculator-contract.md).
- Runtime implementation of the calculator (Go domain, Go HTTP, frontend
  feature) is authored as a sequence of tasks under
  [`docs/tasks/`](./docs/tasks/README.md).

## Architecture

```text
+-------------------------------+
| React calculator feature      | apps/web/src/features/calculator/
| presentation and interaction  |
+---------------+---------------+
                |
+---------------v---------------+
| Frontend API boundary         | apps/web/src/api/
| requests, responses, errors   |
+---------------+---------------+
                |
                | HTTP
                |
+---------------v---------------+
| Go HTTP layer                 | apps/api/internal/httpapi/
| decoding, handlers, responses |
+---------------+---------------+
                |
+---------------v---------------+
| Calculator domain             | apps/api/internal/calculator/
| arithmetic and validation     |
+-------------------------------+
```

Local development will use HTTP between the frontend and backend. HTTPS
termination belongs to the deployment environment and is outside the
application itself.

## Repository structure

```text
calculator/
├── apps/
│   ├── web/              # React + TypeScript frontend
│   └── api/              # Go API workspace
├── docs/                 # Architecture and development documentation
├── package.json          # Root workspace commands
├── pnpm-workspace.yaml
└── README.md
```

## Requirements

- Node.js 20 or newer
- pnpm 9.15.9
- Go 1.22

## Installation

Install the JavaScript workspace dependencies from the repository root:

```bash
pnpm install
```

## Local full-stack development

Start the backend Go server:

```bash
# Terminal 1
cd apps/api
go run ./cmd/server
```

Start the frontend Vite development server:

```bash
# Terminal 2, from the repository root
pnpm dev:web
```

- **Frontend URL:** `http://localhost:3000/` (proxies `/api` to the backend)
- **Backend URL:** `http://localhost:8080/`

### API Base URL Override

By default, the frontend makes same-origin requests to `/api`, which are proxied to the local Go server during development. You can override the API base URL by setting `VITE_API_BASE_URL`:

```bash
VITE_API_BASE_URL=http://localhost:9090 pnpm dev:web
```

Overrides must include a scheme (e.g., `http://`). Malformed overrides without a scheme will cause the development server or build to fail loudly.

### Network behavior

- When the backend is unavailable, the calculator will show a network-failure state with a "Retry" option.
- Domain errors (e.g., division by zero) are returned by the backend and displayed as localized messages.

## Validation

Run the frontend validation suite:

```bash
pnpm validate
```

Build the frontend for production:

```bash
pnpm build:web
```

The same checks can be run directly against the frontend workspace:

```bash
pnpm --filter @calculator/web validate
pnpm --filter @calculator/web build
```

Validate the Go workspace from `apps/api`:

```bash
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go build ./...
```

To format Go files:

```bash
go fmt ./...
```

Run the aggregate Go coverage report:

```bash
make coverage-api
```

## Development workflow

Work is divided into small, reviewable tasks. Each change is implemented,
checked, reviewed, and validated before it is committed.

```text
Task → Implement → Verify → Review → Validate → Commit
```

The full process is documented in
[`docs/delivery-workflow.md`](./docs/delivery-workflow.md).

## Documentation

- [`docs/calculator-contract.md`](./docs/calculator-contract.md) - accepted
  authority for calculator semantics and REST contract.
- [`docs/architecture.md`](./docs/architecture.md) - current structure and
  target architecture.
- [`docs/frontend-foundation.md`](./docs/frontend-foundation.md) - decisions
  made while preparing the frontend foundation.
- [`docs/implementation-guide.md`](./docs/implementation-guide.md) - where
  frontend and backend changes belong.
- [`docs/delivery-workflow.md`](./docs/delivery-workflow.md) - task,
  implementation, review, and delivery process.
- [`docs/ai-usage.md`](./docs/ai-usage.md) - record of AI-assisted work and
  prompts used.
- [`apps/api/README.md`](./apps/api/README.md) - Go workspace overview.

## Design notes

- Arithmetic rules remain independent of HTTP.
- The frontend uses the backend as the source of truth for calculations.
- API errors will use a consistent, documented structure.
- The application does not require a database or authentication.
- Frontend tests may mock network responses, but local development will use
  the real Go service.
- New infrastructure should be added only when the application requires it.

## Not implemented yet

The accepted contract is documented; runtime implementation is authored
as tasks under [`docs/tasks/`](./docs/tasks/README.md).
