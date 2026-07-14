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

- _No entries yet._ Add one per AI-assisted change.
