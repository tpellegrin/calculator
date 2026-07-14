# AI change checklist

A concise checklist for implementation and review. All nontrivial work follows the [delivery workflow](./delivery-workflow.md).

## Task readiness

- [ ] Task document exists in `docs/tasks/`.
- [ ] Task is marked **Ready**.
- [ ] Dependencies and decisions are resolved.
- [ ] Scope and stop conditions are defined.
- [ ] Validation commands are known.

## Before editing

- [ ] Read the task specification carefully.
- [ ] Inspect `git status` for a clean state.
- [ ] Inspect relevant implementation, architecture, and tests.
- [ ] Identify authoritative documents.

## During implementation

- [ ] Stay strictly within task scope.
- [ ] Preserve frontend/backend and domain/transport boundaries.
- [ ] Add or update tests with behavioral changes.
- [ ] Update user copy in all locales (`en-US`, `pt-BR`, `pseudo`).
- [ ] Record material assumptions.

## Before implementation handoff (Self-verification)

- [ ] Inspect the diff for correctness and unrelated changes.
- [ ] Run task-specific tests.
- [ ] Run workspace validation (`pnpm validate` or Go commands).
- [ ] Search for stale symbols, paths, or placeholders.
- [ ] Provide implementation report (files, tests, assumptions, deferrals).
- [ ] Mark task as **Implemented**.

## Before commit

- [ ] Review is resolved; findings adjudicated by Thiago.
- [ ] Accepted findings are applied.
- [ ] Final validation is green.
- [ ] Staged diff is manually inspected.
- [ ] No unrelated changes or secrets are staged.

See [AGENTS.md](../AGENTS.md) for hard rules and architectural boundaries.
