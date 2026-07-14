# T-012 — Final delivery validation

- **Status**: Draft (blocked on T-001 reviews and T-010; independent of optional T-011)
- **Depends on**: T-001, T-002, T-003, T-004, T-005, T-006, T-007,
  T-008, T-009, T-010 (optional T-011 excluded from blocking)
- **Owner**: Thiago (implementer TBD)

## Objective

Perform a repository-wide validation pass against the accepted
contract and the delivery-workflow definition of "Delivered",
executing every validation command, verifying every product
requirement is met, and producing a concise delivery-readiness
report. Bounded corrections are permitted; new features are not.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md).
- [`docs/delivery-workflow.md`](../delivery-workflow.md) (Phase 8).
- [`docs/ai-usage.md`](../ai-usage.md).
- All prior task specifications and their completion reports.

## Context

This is not a new feature phase. It is the final delivery review from
inside the repository. It verifies that everything owed to the
accepted contract has been delivered.

## Accepted decisions

- Validation is bounded; no new features, no reopened owner
  decisions.
- Optional Docker (T-011) is not required for delivery.
- No new dependencies, no new services, no new fake backends.

## Scope

- Execute every applicable repository validation command.
- Verify every accepted contract requirement is observable in the
  code.
- Verify the real-server smoke test runs and passes.
- Verify responsive and keyboard operation of the calculator.
- Verify i18n parity across `en-US`, `pt-BR`, and pseudo-locale.
- Verify that documented API examples work.
- Verify AI prompt disclosure exists.
- Check that no obsolete placeholders remain (e.g., "not yet frozen",
  "next task will define").
- Check for accidental local arithmetic in the frontend.
- Check that no runtime fake backend, database, auth, or unnecessary
  framework has been added.
- Check all documentation links resolve.
- Produce a delivery-readiness report.

## File scope

Permitted:

- Bounded corrections in any file **only** to fix defects found by
  this task's checks (typos, dead links, stale placeholders,
  documentation drift).
- Adding this task's own report at
  `docs/reviews/T-012-delivery-readiness.md`.

Not permitted:

- New features.
- Reopening owner decisions.
- Adding dependencies.
- Rewriting authoritative documents beyond typo/link/stale-phrase
  fixes.

## Out of scope

- Owner adjudication of any newly discovered design choice
  (escalate).

## Required implementation

1. Run the validation pipeline:
   - Frontend:
     - `pnpm --filter @calculator/web format:check`
     - `pnpm --filter @calculator/web lint`
     - `pnpm --filter @calculator/web stylelint`
     - `pnpm --filter @calculator/web typecheck`
     - `pnpm --filter @calculator/web i18n:check`
     - `pnpm --filter @calculator/web test`
     - `pnpm --filter @calculator/web build`
     - `pnpm validate`
     - `pnpm coverage:web` (report only, no threshold)
   - Backend:
     - `cd apps/api && test -z "$(gofmt -l .)"`
     - `go vet ./...`
     - `go test ./...`
     - `go test -race ./...`
     - `go test -tags=integration ./...`
     - `go build ./...`
     - `make coverage-api` (or equivalent; report only)
   - Repo:
     - `git status --short`
     - `git diff --check`
2. Perform product-behavior verification:
   - Start the backend and frontend locally (T-008 command);
   - execute one calculation per operation from contract §4;
   - execute at least one representative of each error class from
     §8 and confirm the localized message renders;
   - verify keyboard-only operation, including retry and clear;
   - verify pseudo-locale rendering; verify pt-BR decimal separator
     input.
3. Repository-wide correctness sweep (read-only):
   - `search_project` for stale phrases:
     `not yet frozen`, `next task will define`, `TODO(T-001)`,
     `challenge`, `evaluator`, `interview`, `client-only`
     arithmetic hints in `apps/web/src/`;
   - list results in the report; correct any dead documentation
     links within the bounded-correction scope.
4. Contract cross-check:
   - map every contract § to an implementation location or test;
   - mark any unmapped section as a blocker.
5. Compile the report at
   `docs/reviews/T-012-delivery-readiness.md` following the
   report format in `docs/reviews/README.md`.

## Required behavior

- Every validation command runs and exits successfully; or, if any
  command exits non-zero, this task must not declare delivery
  readiness.
- Every contract § has a mapped implementation and at least one
  test.
- The delivery-readiness report exists and is complete.
- Optional Docker (T-011) status is stated explicitly and not used
  to block delivery.

## Edge cases

- Coverage reports fluctuate between runs; the report must record
  numbers as observed and not enforce a threshold.
- The smoke test may briefly bind ephemeral ports; ensure no
  processes leak between commands.

## Tests

- No new automated tests.

## Validation

Every command in "Required implementation" step 1 is itself the
validation for this task, plus:

```bash
git status --short
git diff --check
```

## Documentation impact

- Adds `docs/reviews/T-012-delivery-readiness.md`.
- May adjust stale phrases in existing documentation within scope.

## Stop conditions

- Any validation command fails and the failure requires a new
  feature, an owner decision, or a scope change to fix.
- The contract has an unmapped section.
- A stale placeholder cannot be corrected without changing behavior.
- A previously accepted decision would need to be reopened.

## Completion report

- Full command log summary (pass/fail per command);
- coverage numbers (report only);
- product-behavior verification checklist with outcomes;
- stale-phrase sweep results;
- contract-to-implementation mapping;
- explicit confirmation: no new features, no new dependencies, no
  reopened owner decisions, T-011 status stated but not blocking.
