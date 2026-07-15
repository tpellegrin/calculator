# T-009 — Integration, smoke tests, and coverage

- **Status**: Implemented
- **Depends on**: T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008
- **Owner**: Thiago (implementer TBD)

## Objective

Provide a real-server HTTP smoke test that exercises the contract
against a live Go server, ensure contract-level representative
scenarios are covered, add Go and frontend coverage report commands
without introducing a repository-wide numeric threshold, and wire
these into CI where the repository scope supports it — without
browser automation.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), §18,
  §19.
- [`docs/delivery-workflow.md`](../delivery-workflow.md).
- Existing Go and pnpm scripts.

## Context

Unit tests exist per layer. This task adds one end-to-end HTTP
smoke test against a real Go server and standardizes coverage
reporting.

## Accepted decisions

- Real-server HTTP smoke test covers `/healthz`, one successful
  calculation, and one domain failure.
- No browser automation.
- No repository-wide numeric coverage threshold; coverage is
  behavioral.
- Coverage commands must not require new dependencies.

## Scope

- Add a Go integration test (build tag `integration`) that starts
  the composed handler in-process via `httptest.NewServer` and
  hits it over real HTTP.
- Add root-level scripts to run coverage:
  - Go: `go test ./... -coverprofile=coverage.out` and a
    `go tool cover -func=coverage.out` summary command;
  - Frontend: `pnpm --filter @calculator/web test:coverage`
    (uses Vitest built-in `--coverage`; adjust if the workspace
    already has a coverage script).
- CI integration:
  - if the repository already has a CI workflow, extend it to run
    the smoke test and coverage summaries;
  - if not, do not add a CI workflow in this task.

## File scope

Permitted:

- `apps/api/internal/httpapi/integration_test.go` (or similar,
  `// +build integration`).
- `apps/api/Makefile` if useful and repository-consistent (existing
  Makefile at repo root may be extended additively).
- Root `package.json` (add coverage scripts only; no dependencies).
- CI configuration files that already exist.

Not permitted:

- New CI files if none exist (defer to owner).
- Any browser-automation dependency (`playwright`, `cypress`, …).
- Any new npm or Go dependency.
- Reopening validation rules from T-003 or the contract.

## Out of scope

- Additional per-layer unit tests (owned by earlier tasks).
- Documentation of API examples (owned by T-010).
- Docker (T-011).

## Required implementation

1. Integration test (Go, tag `integration`):
   - starts `httptest.NewServer(httpapi.NewHandler(...))`;
   - hits `GET /healthz` and asserts `200` **and body exactly
     `{"status":"ok"}`** (contract §6.1);
   - hits `POST /api/v1/calculations` with `{"operation":"divide","operands":[10,4]}`
     and asserts `200` + `result==2.5`;
   - hits `POST /api/v1/calculations` with `{"operation":"divide","operands":[1,0]}`
     and asserts `422` + `error.code == "division_by_zero"`.
2. Contract-level representative scenarios (Go): the same test file
   also exercises one representative of each error class
   (`invalid_json`, `invalid_request`, `unsupported_operation`,
   `invalid_operands`, `math_domain`, `numeric_overflow`,
   `payload_too_large`, `unsupported_media_type`,
   `method_not_allowed`, `not_found`). The `invalid_json`
   representative **must** include one case that submits a body
   containing a literal `NaN` token (unquoted) and asserts
   `400 invalid_json` (contract §5.2, §7 rule 7). The
   `invalid_request` representative must use a wrong-typed operand
   element such as a stringified `"NaN"` or a `null` operand and
   assert `400 invalid_request` (contract §7 rule 8). Every non-2xx
   response asserted here must also carry the JSON envelope
   (`Content-Type: application/json; charset=utf-8`,
   `Cache-Control: no-store`), including the `405` and `404` cases
   (contract §11).
3. Coverage:
   - Go: add `make coverage-api` (or equivalent
     `apps/api/Makefile` target) that runs
     `go test ./... -coverprofile=coverage.out` and
     `go tool cover -func=coverage.out | tail -n 1`;
   - Frontend: add root `package.json` script
     `"coverage:web": "pnpm --filter @calculator/web test -- --coverage"`
     (adjust exact syntax to the project's Vitest configuration).
4. CI:
   - if a workflow file exists, add jobs invoking the smoke test
     (with `-tags=integration`) and coverage summaries;
   - do not fail CI on coverage percentage — reporting only.

## Required behavior

- `go test -tags=integration ./apps/api/...` runs the smoke test and
  passes on a green build.
- `make coverage-api` (or equivalent) prints an aggregate coverage
  percentage; no threshold is enforced.
- `pnpm coverage:web` prints frontend coverage; no threshold.
- Regular `go test ./...` and `pnpm test:web` are unaffected (no
  incidental fails, no new dependencies).

## Edge cases

- Integration test avoids fixed ports; uses `httptest.NewServer`
  ephemeral ports.
- Integration test is isolated: it does not read env vars, does
  not touch disk beyond the temp dir Go provides.
- Coverage on the frontend must not include generated build output
  or `node_modules`.

## Tests

- The added integration test itself.
- No new unit-test suites are required; the layer tests continue to
  own their behaviors.

## Validation

From `apps/api/`:

```bash
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go test -tags=integration ./...
go build ./...
```

From repo root:

```bash
pnpm validate
pnpm coverage:web
git diff --check
```

## Documentation impact

- `README.md` gains coverage-command mentions in the Validation
  section (owned by T-010 for the polish pass; a minimal reference
  here is acceptable).

## Stop conditions

- The integration test cannot be authored without a new dependency.
- CI files do not exist and the owner has not authorized adding one.
- A representative scenario cannot be triggered from the composed
  handler (indicates a T-003 gap).

## Completion report

- Files added; smoke test output; coverage numbers reported (not
  enforced); confirmation: no browser automation, no dependency
  additions.
