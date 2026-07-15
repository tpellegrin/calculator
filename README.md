# Calculator

A full-stack calculator monorepo featuring a React + TypeScript frontend and a Go HTTP API service.

## Project overview

This project implements a physical-style calculator. The system is split into:

- **Frontend**: A React application that manages the user interface, input composition, and display.
- **Backend**: A Go service that performs all arithmetic, enforces the calculation contract, and validates requests.

The backend arithmetic is authoritative. The frontend requests calculations through the HTTP API and does not perform any client-side arithmetic for the operations owned by the API. The relationship between the layers is governed by a strict, contract-first design.

## Requirements

The following versions are required to develop and run the project:

- **Node.js**: `^20.0.0` or later.
- **pnpm**: `9.15.9`.
- **Go**: `1.22` or later.

Corepack is recommended for managing the pnpm version:

```bash
corepack enable
```

## Installation

From the repository root:

1. Install Node.js dependencies:
   ```bash
   pnpm install
   ```
2. Go dependencies are resolved automatically by the Go toolchain during build or run.

## Development

The application requires both the frontend and backend to be running for full functionality.

### Frontend

Starts the Vite development server with hot-module replacement.

```bash
pnpm dev:web
```

- **URL**: `http://localhost:3000`
- **Proxy**: Vite is configured to proxy `/api` requests to `http://localhost:8080`.

### Backend

Starts the Go HTTP server.

```bash
cd apps/api
go run ./cmd/server
```

- **Port**: `8080` (default, override with `PORT` environment variable).
- **Health check**: `http://localhost:8080/healthz`.

## Local full-stack development

To run the complete application locally, use two terminal windows:

**Terminal 1 (Backend)**:

```bash
cd apps/api
go run ./cmd/server
```

**Terminal 2 (Frontend)**:

```bash
pnpm dev:web
```

Navigate to `http://localhost:3000`. The frontend will communicate with the backend via the Vite development proxy.

## API examples

The calculator API follows the contract defined in `docs/calculator-contract.md`.

### Successful calculation

**Request**:

```http
POST /api/v1/calculations
Content-Type: application/json

{
  "operation": "divide",
  "operands": [10, 4]
}
```

**Response**: `200 OK`

```json
{
  "operation": "divide",
  "operands": [10, 4],
  "result": 2.5
}
```

### Request validation error

**Request** (invalid operand type):

```http
POST /api/v1/calculations
Content-Type: application/json

{
  "operation": "add",
  "operands": ["1", 2]
}
```

**Response**: `400 Bad Request`

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request body does not match the expected schema."
  }
}
```

### Domain error

**Request** (division by zero):

```http
POST /api/v1/calculations
Content-Type: application/json

{
  "operation": "divide",
  "operands": [1, 0]
}
```

**Response**: `422 Unprocessable Entity`

```json
{
  "error": {
    "code": "division_by_zero",
    "message": "Division by zero is not allowed."
  }
}
```

## Operation semantics

The calculator supports the following operations:

- **Addition**: `add([a, b])`
- **Subtraction**: `subtract([a, b])`
- **Multiplication**: `multiply([a, b])`
- **Division**: `divide([a, b])`
- **Power**: `power([base, exponent])`
- **Square root**: `sqrt([x])`
- **Percentage**: `percentage([base, rate])`

The backend arithmetic is authoritative. For detailed semantics, edge-case rules, and numeric policies, see [docs/calculator-contract.md](./docs/calculator-contract.md).

## Errors

The API returns structured error envelopes with stable codes. Common errors include:

- `division_by_zero` (`422`): Attempted to divide by zero.
- `numeric_overflow` (`422`): The result exceeds the representable `float64` range.

See the [authoritative contract](./docs/calculator-contract.md) for the complete list of error codes and their HTTP status mappings.

## Validation

The project includes a comprehensive validation suite for both frontend and backend.

### Full-stack validation

Runs all frontend checks (format, lint, types, tests).

```bash
pnpm validate
```

### Backend validation

From `apps/api/`:

```bash
go vet ./...      # Static analysis
go build ./...    # Compilation
go test ./...     # Unit tests
go test -tags=integration ./...  # Integration smoke tests
```

### Frontend validation

From `apps/web/`:

```bash
pnpm lint         # ESLint
pnpm lint:css     # Stylelint
pnpm typecheck    # TypeScript
pnpm test:run     # Unit tests
pnpm i18n:check   # i18n parity check
```

## Coverage

Test coverage is reported for both workspaces. No repository-wide numeric threshold is enforced; coverage is behavioral and layer-specific.

### Backend coverage

```bash
make coverage-api
```

Reports total statement coverage for the Go packages.

### Frontend coverage

```bash
pnpm coverage:web
```

Generates a Vitest coverage report for the React application.

## Design notes

- **Backend-authoritative**: All arithmetic and validation logic is owned by the Go service to ensure consistency.
- **Contract-first**: The API behavior is defined in a shared contract before implementation.
- **Layered separation**: Clear boundaries between domain logic, transport adapters, and UI components.
- **Same-origin development**: Vite proxies `/api` to the backend to simplify local development without CORS.
- **i18n & Theming**: User-facing strings and visual tokens are managed centrally in the frontend.

For more details, see:

- [docs/architecture.md](./docs/architecture.md)
- [docs/calculator-contract.md](./docs/calculator-contract.md)
- [docs/delivery-workflow.md](./docs/delivery-workflow.md)

## Known limitations

- **Floating-point**: The calculator uses IEEE-754 `float64` (binary64). Results are subject to standard floating-point precision limitations.
- **Non-monetary**: This application is not suitable for monetary, accounting, or ledger-based calculations requiring exact decimal precision.
- **Docker**: Docker packaging is currently optional/future and is not required for local development.

## AI prompt disclosure

This repository uses AI assistance for implementation, review, and documentation. All AI-assisted work is recorded and disclosed.

See [docs/ai-usage.md](./docs/ai-usage.md).

## Documentation index

- [Calculator Contract](./docs/calculator-contract.md) — Authoritative API behavior and semantics.
- [Architecture](./docs/architecture.md) — System design and repository layout.
- [Implementation Guide](./docs/implementation-guide.md) — How to extend the project.
- [Delivery Workflow](./docs/delivery-workflow.md) — Tasks, reviews, and completion process.
- [AI Usage](./docs/ai-usage.md) — Disclosure and prompt log.
- [Backend API README](./apps/api/README.md) — Go workspace details.
- [Frontend API README](./apps/web/src/api/README.md) — Frontend network layer details.
