# Delivery workflow

This document defines the authoritative implementation workflow for the Calculator repository. All nontrivial work follows this process to ensure human ownership of architecture, quality, and delivery while enabling efficient AI-assisted implementation.

## Workflow phases

The workflow follows these conceptual phases:

1. **Task definition** — A task is written and reviewed before implementation.
2. **Implementation** — Bounded implementation within the task scope.
3. **Self-verification** — The implementer verifies their own work.
4. **Fresh-context review** — Adversarial inspection from a fresh AI context or human.
5. **Finding adjudication** — Thiago accepts, rejects, or modifies findings.
6. **Final validation** — Running the complete validation suite.
7. **Commit** — Coherent, reviewable commit (only when requested).
8. **Delivery readiness review** — Final repository-level evaluation.

---

### Phase 1 — Task definition

A task must be authored before implementation begins. Task definitions must be proportional to the work.

Each task must define:

- **Task ID and title** (e.g., `T-001 — Define contract`);
- **Objective** and **Rationale**;
- **Dependencies** and **Authoritative documents**;
- **Allowed scope** and **Explicitly excluded scope**;
- **Intended files** or ownership areas;
- **Architectural boundaries**;
- **Required behavior** and **Edge cases**;
- **Test expectations** and **Validation commands**;
- **Documentation impact**;
- **Stop conditions**;
- **Completion report format**.

The task must distinguish:

- Decisions already frozen;
- Decisions the implementer may make;
- Decisions that require Thiago’s judgment.

### Phase 2 — Implementation

Implementation occurs in a bounded context. The implementer must:

- Inspect relevant files before editing;
- Follow repository authority (architecture, guides, contract);
- Remain strictly inside task scope;
- Avoid unrelated cleanup;
- Preserve frontend/backend separation;
- Avoid new dependencies unless explicitly authorized;
- Add or update tests with behavior;
- Report material assumptions;
- Stop when a stop condition is reached.

Implementation must not include a commit unless the task explicitly requests one.

### Phase 3 — Self-verification

Before handoff, the implementer must:

- Inspect the diff;
- Run task-specific tests;
- Run workspace-specific lint/type/build checks;
- Confirm documentation truthfulness;
- Search for stale symbols and paths;
- Report changed files, tests, validation results, assumptions, and deferred work.

A green command is necessary but not sufficient; manual inspection of runtime behavior is required when applicable.

### Phase 4 — Fresh-context review

Review is performed from a fresh context (e.g., a new AI session or a separate reviewer). The reviewer must not assume the implementation report is correct.

The reviewer inspects:

- Task specification;
- Actual diff;
- Architecture and implementation quality;
- Tests and validation coverage;
- Documentation accuracy.

Review findings must include **severity** (Blocker, Important, Optional), **location**, and **minimal recommended correction**.

### Phase 5 — Finding adjudication

Thiago retains final authority. Each review finding is accepted, accepted with modification, rejected, or deferred. AI review output is advisory; suggestions are not automatically applied.

### Phase 6 — Final validation

After findings are resolved, run the complete validation suite:

- **Frontend**: format, lint, stylelint, typecheck, tests, i18n, production build.
- **Backend**: gofmt, go vet, go test, go build.
- **Full-stack**: Integration/E2E tests (if applicable) and `git diff --check`.

Documentation must match the final implementation.

### Phase 7 — Commit

Commits must be coherent, reviewable, conventional, and free of unrelated changes. Inspect `git status` and the staged diff before committing. Do not use broad staging (`git add .`) without inspection.

### Phase 8 — Delivery readiness

Before final delivery, perform a repository-wide evaluation:

- Clean checkout setup and startup;
- Frontend/backend integration;
- CI, tests, and coverage;
- API examples and architecture rationale;
- AI prompt disclosure;
- Removal of stale placeholders and challenge-specific wording.

---

## Task states

Tasks move through these states:

- **Draft**: Task is being authored.
- **Ready**: Dependencies and decisions are resolved; task is ready for implementation.
- **In Progress**: Implementer is working on the task.
- **Implemented**: Task-scoped verification passes; ready for review.
- **In Review**: Fresh-context review is underway.
- **Changes Requested**: Accepted review findings are being applied.
- **Validated**: Findings are resolved and full validation is green.
- **Committed**: An explicit commit has been created.
- **Delivered**: Repository-level delivery review passes.

## Roles

- **Thiago**: Owner and final decision-maker. Owns product judgment, scope, architecture, and acceptance of all work.
- **Implementer**: (Thiago or AI Agent). Owns bounded implementation, tests, and self-verification.
- **Reviewer**: (Fresh AI context or human). Owns adversarial inspection and evidence-based findings.
- **Delivery reviewer**: Performs the final repository-level evaluation from a finished state.

Only Thiago accepts work; AI does not "approve" or "deliver" independently.

## Authority hierarchy

When authorities conflict, stop and report. Precedence:

1. Task specification
2. Architecture and contract documents
3. Workspace-local documentation
4. Implementation
5. Tests
6. README and public examples
