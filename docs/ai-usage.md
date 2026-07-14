# AI usage

Policy and running log for AI-assisted work in this repository. See
[`ai-change-checklist.md`](./ai-change-checklist.md) for the checklist
every AI-authored change must satisfy.

## Policy

- AI assistance is welcome for research, refactoring, repetitive scaffolding,
  documentation, and test scaffolding.
- AI must not silently rewrite architectural decisions. The documents
  in `docs/` are the source of truth.
- AI must not commit or push unless explicitly requested by the task. Only
  humans commit and push independently.
- AI must not add new dependencies without an explicit, feature-driven
  justification.
- AI must not weaken tests, lints, or type strictness to make a
  pipeline pass.
- AI-assisted work must run the validation pipeline before submission
  (`pnpm validate` and, for backend work, the Go verifications).
- Sensitive information (tokens, credentials, private URLs) must never
  appear in prompts, logs, or generated code.
- Historical context: the frontend was initialized from a personal
  React foundation and reduced to a minimal shell suitable for this
  project. That fact belongs here and in
  [`frontend-foundation.md`](./frontend-foundation.md); no other
  document should reference it.

## Process

AI assistance is integrated into the [delivery workflow](./delivery-workflow.md):

- **Tasks** define bounded authority and scope.
- **AI Agents** may act as an Implementer or a Reviewer.
- **Separate contexts**: Implementation and review should use separate AI sessions to ensure fresh-context inspection.
- **Thiago** evaluates all findings and makes final decisions. Human ownership is preserved.

## Prompt log

Each meaningful AI-driven change must append an entry below.

### Entry format

## <Task ID — Title>

- **Date**: YYYY-MM-DD
- **Model/tool**:
- **Role**: implementation | review | repository audit
- **Objective**:
- **Prompt**:
- **Files changed or reviewed**:
- **Suggestions accepted**:
- **Suggestions modified**:
- **Suggestions rejected**:
- **Manual verification**:

### Entries

## T-001 — Stage 6 reconciliation and downstream task authoring

- **Date**: 2026-07-14
- **Model/tool**: Claude (via WebStorm Junie agent)
- **Role**: implementation (documentation-only; no runtime code)
- **Objective**:
  1. Consolidate the duplicate T-001 files
     (`…-adjudicated.md` → canonical path) and reconcile Stages 2–4
     against the owner adjudication in Stage 5.
  2. Author the accepted authority document
     `docs/calculator-contract.md` from Stage 5 decisions.
  3. Apply minimal consistency updates to `README.md`,
     `docs/architecture.md`, `docs/implementation-guide.md`,
     `apps/api/README.md`, and `apps/web/src/api/README.md`.
  4. Set T-001 status honestly to "In Review" and, in the absence of
     independent reviewers, create two fresh-context review prompts
     under `docs/reviews/`.
  5. Author the complete downstream implementation task set
     (T-002…T-012), including a dependency graph in
     `docs/tasks/README.md`.
- **Prompt**: The owner instruction titled "T-001 finalization and
  downstream task authoring" (retained privately by the owner; not
  reproduced verbatim per repository disclosure conventions).
- **Files changed or reviewed**:
  - Removed: `docs/tasks/T-001-define-calculator-semantics-and-rest-contract-adjudicated.md`.
  - Modified: `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`
    (canonical; merged adjudication, added Stage 2/3/4 reconciliation
    banners, renamed "Owner adjudication" to "Stage 5", added Stage 6
    execution record).
  - Modified: `README.md`, `docs/architecture.md`,
    `docs/implementation-guide.md`, `apps/api/README.md`,
    `apps/web/src/api/README.md` (minimal, purpose-preserving).
  - Added: `docs/calculator-contract.md`.
  - Added: `docs/reviews/T-001-technical-contract-review-prompt.md`,
    `docs/reviews/T-001-frontend-product-review-prompt.md`.
  - Added: `docs/tasks/T-002…T-012-*.md` (eleven tasks).
  - Modified: `docs/tasks/README.md` (task index + dependency graph),
    `docs/ai-usage.md` (this entry).
- **Suggestions accepted**: All owner-adjudicated Stage 5 decisions
  encoded into `docs/calculator-contract.md` and downstream tasks.
- **Suggestions modified**: None. Stage 5 decisions were treated as
  binding without modification.
- **Suggestions rejected**: Any pre-adjudication proposal from
  Stages 2–4 that conflicts with Stage 5 (five-operation scope,
  deferred `power`/`percentage`, `/v1/calculations` without `/api`,
  1 MiB body limit, 11-code error taxonomy without `not_found`,
  operation-driven form, 12 maximum fraction digits, two-service
  Docker Compose, no real-server smoke test).
- **Manual verification**:
  - `git status --short` confirmed the deletion of the
    `-adjudicated.md` file and the presence of one canonical T-001.
  - Internal links from the new documents to the contract, T-001
    stages, and review prompts spot-checked.
  - Independent reviews of `docs/calculator-contract.md` are
    **not** completed; downstream tasks remain in Draft/blocked
    state pending those reviews.
- **Non-compliance record**: none. No runtime code, no dependencies,
  no CI configuration, and no commits were produced by this entry.
