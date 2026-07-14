# T-011 — Optional Docker packaging (stretch, non-blocking)

- **Status**: Draft — **Optional/stretch, non-blocking**. Do not
  attempt before T-002–T-010 are Implemented. Not required for final
  delivery.
- **Depends on**: T-001, T-002, T-003, T-004, T-005, T-006, T-007,
  T-008, T-009, T-010
- **Owner**: Thiago (implementer TBD)

## Objective

Provide a single multi-stage full-stack Docker image that builds the
React frontend, builds the Go server, and produces a minimal final
image that serves the built frontend static assets, the
`/api/v1/calculations` endpoint, and `/healthz` from one origin,
with no CORS.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md) §21.
- [`docs/architecture.md`](../architecture.md).
- The existing Go server from T-004 and HTTP boundary from T-003.

## Context

Docker packaging was intentionally deferred. This task is optional
and non-blocking: T-012 must be able to declare delivery readiness
without this task being Implemented.

## Accepted decisions

- One multi-stage full-stack image (React build stage → Go build
  stage → minimal final image).
- Final image serves `/api/v1/calculations`, `/healthz`, and the
  built frontend static assets from one origin.
- No CORS.
- A minimal Compose wrapper is permitted only if it materially
  improves developer experience.
- A container health check may be added if proportionate.

## Scope

- `Dockerfile` at the repository root (multi-stage).
- Optional `docker-compose.yml` (thin wrapper).
- `docker/README.md` describing build, run, and health-check usage.
- Extension of `apps/api/cmd/server` to serve static assets from a
  configurable directory **only if needed** to satisfy the single-
  origin requirement; this extension must not move any
  arithmetic, decoding, encoding, or contract-level behavior into
  bootstrap code.

## File scope

Permitted:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml` (optional)
- `docker/README.md` or `docs/docker.md`
- `apps/api/cmd/server/*.go` for a minimal static-serving addition
  gated behind a config flag or environment variable
  (e.g., `STATIC_DIR`).
- Additions to `apps/api/cmd/server/*_test.go` covering the static
  serving behavior.

Not permitted:

- Any change to `apps/api/internal/calculator/**`.
- Any change to `apps/api/internal/httpapi/**` that alters the
  HTTP contract from T-003.
- Any new Go or npm runtime dependency.
- Any change that reintroduces CORS.

## Out of scope

- Publishing the image to a registry.
- Kubernetes manifests, orchestration, or IaC.
- Multi-service compose beyond the single image (the contract
  explicitly rejects a two-service dev topology as the preferred
  design).

## Required implementation

1. `Dockerfile`:
   - Stage `web-builder`: `node:20-alpine`, installs pnpm at the
     pinned version, runs `pnpm install --frozen-lockfile` and
     `pnpm build:web`;
   - Stage `api-builder`: `golang:1.22-alpine`, builds a static Go
     binary from `apps/api/cmd/server`;
   - Final stage: minimal distroless or `alpine:latest`, copies the
     Go binary and the frontend `dist/` into the image, sets
     `STATIC_DIR=/app/web` and `PORT=8080`, exposes 8080.
2. Static asset serving in `cmd/server`:
   - if `STATIC_DIR` is set, mount a `http.FileServer` at `/` that
     serves the directory and falls through to the HTTP API
     handler for `/api/*` and `/healthz`;
   - never serve `/api/*` or `/healthz` from the file server;
   - fall back to `index.html` for unknown paths only under `/`
     (SPA routing) — this is safe because the app has a single
     view.
3. Optional `docker-compose.yml`:
   - one service, `calculator`, built from the root `Dockerfile`,
     exposing 8080;
   - a health check that curls `/healthz`.
4. Documentation:
   - `docker/README.md` (or `docs/docker.md`) with build, run,
     health-check, and stop commands, and a note that Docker is
     optional.
5. `.dockerignore`:
   - `node_modules`, `apps/web/dist`, `apps/api/coverage.out`,
     `.git`, `docs/`.

## Required behavior

- `docker build -t calculator .` succeeds on a clean checkout.
- `docker run --rm -p 8080:8080 calculator` serves the SPA at
  `http://localhost:8080/` and the API at
  `http://localhost:8080/api/v1/calculations`; `/healthz` returns
  `200`.
- The final image does not open any port other than 8080; there is
  no CORS middleware; a domain error still returns the contract
  envelope.
- Adding `STATIC_DIR` is optional: without it, the server behaves
  exactly like T-004 (no static serving), so ordinary local dev is
  unaffected.

## Edge cases

- Missing `STATIC_DIR`: server runs as API-only (T-004 parity).
- `STATIC_DIR` set to a non-existent directory: log clearly and
  exit non-zero.
- `/api/nonexistent` in the containerized image returns the
  contract `404 not_found`, not an HTML SPA index.

## Tests

- Go tests for the static-serving branch:
  - with `STATIC_DIR` unset: `/` returns `404` (or an existing
    behavior) and `/api/v1/calculations` works;
  - with `STATIC_DIR` set to a temp dir containing `index.html`:
    `/` returns `index.html`, `/api/v1/calculations` still works,
    `/api/unknown` returns `404` from the API handler.
- A manual build/run capture is acceptable for image behavior;
  automated container tests are not required.

## Validation

```bash
# repo-level
pnpm validate

# API
cd apps/api
gofmt -l .
go vet ./...
go test ./...
go build ./...

# Docker
docker build -t calculator .
docker run --rm -d --name calc -p 8080:8080 calculator
curl -sSf http://localhost:8080/healthz
curl -sSf -X POST -H 'Content-Type: application/json' \
  -d '{"operation":"add","operands":[1,2]}' \
  http://localhost:8080/api/v1/calculations
docker stop calc
```

## Documentation impact

- `README.md` gains an "Optional Docker" section linking to the new
  Docker documentation.
- `docs/architecture.md` may receive a one-line note in the Docker
  section.

## Stop conditions

- Docker or a supported daemon is unavailable in the environment.
- The single-image design would require modifying HTTP-boundary
  behavior beyond static-serving.
- A new runtime dependency would be required.

## Completion report

- Files added; build/run outputs; test results; confirmation: no
  CORS, no new runtime dependency, no change to arithmetic or HTTP
  contract, task remains marked optional.
