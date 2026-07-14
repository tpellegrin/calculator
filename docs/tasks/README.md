# Implementation tasks

Canonical location for implementation task specifications.

## Task naming convention

- Format: `T-XXX-short-description.md`
- Example: `T-001-define-calculator-contract.md`

## Workflow integration

- Tasks are authored in the **Draft** state.
- Once dependencies and decisions are resolved, they move to **Ready**.
- Implementation work follows the process in [docs/delivery-workflow.md](../delivery-workflow.md).
- Temporary status wording in general documentation must be removed or updated by the task that makes it obsolete.
- No task may claim implementation that does not exist.

## Task index

Governing authority for calculator semantics and REST contract:
[`docs/calculator-contract.md`](../calculator-contract.md).
All T-002..T-012 tasks below implement to that contract.

| ID    | Title                                         | Depends on                            | Required/Optional | Status                             |
| ----- | --------------------------------------------- | ------------------------------------- | ----------------- | ---------------------------------- |
| T-001 | Define calculator semantics and REST contract | —                                     | Required          | In Review (independent reviews pending) |
| T-002 | Implement the Go calculator arithmetic domain | T-001                                 | Required          | Draft (blocked on T-001 reviews)   |
| T-003 | Implement the Go HTTP API                     | T-001, T-002                          | Required          | Draft (blocked on T-001 reviews)   |
| T-004 | Implement the Go server lifecycle             | T-001, T-002, T-003                   | Required          | Draft (blocked on T-001 reviews)   |
| T-005 | Implement frontend calculator API integration | T-001                                 | Required          | Draft (blocked on T-001 reviews)   |
| T-006 | Implement the physical-calculator state model | T-001, T-005                          | Required          | Draft (blocked on T-001 reviews)   |
| T-007 | Implement the physical-calculator UI          | T-001, T-005, T-006                   | Required          | Draft (blocked on T-001 reviews)   |
| T-008 | Application wiring and local development      | T-001, T-004, T-005, T-006, T-007     | Required          | Draft (blocked on T-001 reviews)   |
| T-009 | Integration, smoke tests, and coverage        | T-001…T-008                           | Required          | Draft (blocked on T-001 reviews)   |
| T-010 | Final documentation                           | T-001…T-009                           | Required          | Draft (blocked on T-001 reviews)   |
| T-011 | Optional Docker packaging                     | T-001…T-010                           | **Optional**      | Draft (blocked on T-001 reviews)   |
| T-012 | Final delivery validation                     | T-001…T-010 (T-011 excluded)          | Required          | Draft (blocked on T-001 reviews)   |

Independent reviews of T-001 are outstanding. Downstream tasks
must not advance to **Ready** until:

1. the technical-contract review completes and its findings are
   adjudicated;
2. the frontend/product review completes and its findings are
   adjudicated.

See:

- [`../reviews/T-001-technical-contract-review-prompt.md`](../reviews/T-001-technical-contract-review-prompt.md)
- [`../reviews/T-001-frontend-product-review-prompt.md`](../reviews/T-001-frontend-product-review-prompt.md)

## Dependency graph

Critical path (required tasks):

```
T-001 ──► T-002 ──► T-003 ──► T-004 ─┐
   │                                 │
   ├──► T-005 ──► T-006 ──► T-007 ───┼──► T-008 ──► T-009 ──► T-010 ──► T-012
   │                                 │
   └───────────────────────── (also feeds T-008)
```

Optional branch:

```
T-010 ──► T-011  (optional; does not block T-012)
```

Parallelism after T-001 reviews are reconciled:

- **Backend track**: `T-002 → T-003 → T-004`.
- **Frontend prep track**: `T-005 → T-006 → T-007`.
- The two tracks converge at `T-008` (full-stack wiring).
- `T-009` (integration + coverage) depends on the composed system.
- `T-010` (final docs) depends on implemented behavior.
- `T-011` (Docker) is optional and non-blocking.
- `T-012` (final delivery validation) depends on all required tasks
  but **not** on `T-011`.

Rules:

- `T-006` (state model) must precede `T-007` (UI). UI must not
  precede the state contract.
- `T-004` (server lifecycle) depends on `T-003` (HTTP handlers),
  which depends on `T-002` (domain).
- Required tasks must not depend on the optional `T-011`.
- No cycles.

## Task template

# T-XXX — Title

- **Status**: Draft | Ready | In Progress | Implemented | Validated | Committed | Delivered
- **Depends on**:
- **Owner**:
- **Reviewer**:

## Objective

## Context

## Authoritative inputs

## Scope

## Out of scope

## Decisions already made

## Decisions allowed

## Required implementation

## Edge cases

## Tests

## Validation

## Documentation impact

## Stop conditions

## Completion report
