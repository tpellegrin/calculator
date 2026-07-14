# T-010 — Final documentation

- **Status**: Draft (blocked on T-001 reviews and T-008)
- **Depends on**: T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009
- **Owner**: Thiago (implementer TBD)

## Objective

Finalize repository documentation so a new reader can set up, run,
develop, validate, and understand the calculator without needing the
task specifications.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md).
- [`docs/architecture.md`](../architecture.md).
- [`docs/ai-usage.md`](../ai-usage.md).
- [`docs/delivery-workflow.md`](../delivery-workflow.md).

## Context

Documentation exists but predates the implemented calculator. Some
statements were written when the contract was not yet frozen and
were minimally patched during T-001. This task performs the polish
pass now that runtime behavior exists.

## Accepted decisions

- All calculator semantics live in `docs/calculator-contract.md`;
  documentation elsewhere links to it, does not restate it.
- No company, interview, evaluator, or challenge branding anywhere
  in the repository.
- Repository/remote URLs are placeholders when the real remote is
  not yet known.
- AI prompt disclosure is retained per `docs/ai-usage.md`.

## Scope

Update:

- `README.md`:
  - setup instructions (Node, pnpm, Go versions);
  - frontend development commands;
  - backend development commands;
  - full-stack local run;
  - API examples (request/response for one success and two error
    classes);
  - operation semantics summary (link to the contract);
  - error examples with codes and HTTP statuses;
  - design rationale summary (short);
  - test and coverage commands;
  - known limitations (floating-point, no monetary guarantees,
    optional Docker);
  - AI prompt disclosure section (link to `docs/ai-usage.md`);
  - repository link placeholder only if appropriate.
- `docs/architecture.md`: reconcile against the final layout;
  remove any remaining "planned" or "next task" wording that no
  longer applies.
- `docs/implementation-guide.md`: reconcile to actual layout after
  T-002–T-008.
- `apps/api/README.md`: update "not present yet" and run commands.
- `apps/web/src/api/README.md`: reflect the calculator API layer
  from T-005.
- `docs/ai-usage.md`: append final aggregate entries per that
  document's format.

## File scope

Permitted:

- `README.md`.
- `docs/architecture.md`, `docs/implementation-guide.md`,
  `docs/ai-usage.md`.
- `apps/api/README.md`, `apps/web/src/api/README.md`, and any
  workspace-local READMEs whose statements have become stale.

Not permitted:

- Any change to code, tests, CI, `package.json`, `go.mod`, or
  `docker` files.
- Any edit to `docs/calculator-contract.md` beyond obvious typo
  fixes; substantive edits require owner adjudication.
- Any edit to `docs/tasks/T-001-*.md` beyond obvious typo fixes.

## Out of scope

- Docker documentation (owned by T-011).
- Final delivery-readiness report (owned by T-012).

## Required implementation

1. Root `README.md` sections:
   - Requirements;
   - Installation;
   - Development (frontend + backend);
   - Local full-stack development;
   - API examples;
   - Operation semantics (link to contract);
   - Errors (link to contract, with two examples);
   - Validation;
   - Coverage;
   - Design notes;
   - Known limitations;
   - AI prompt disclosure link;
   - Documentation index.
2. `docs/architecture.md`: replace any remaining "planned" prose in
   the sections describing packages that now exist; keep
   already-linked references to the contract.
3. `docs/implementation-guide.md`: update the "Add calculator
   behavior" sequence to reflect the actual codepaths and file
   ownership after T-002..T-008.
4. `apps/api/README.md`: replace "Not present yet" with the actual
   surface; keep the module-path placeholder note.
5. `apps/web/src/api/README.md`: replace the "not yet finalized"
   reference with the calculator API module and link to the
   contract.
6. `docs/ai-usage.md`: add a final aggregate entry.

## Required behavior

- Every link in `README.md` resolves to an existing file/section.
- No section claims a not-yet-implemented behavior after all
  dependencies are Implemented.
- No section contradicts `docs/calculator-contract.md`.
- No hard-coded numeric coverage threshold is claimed.

## Edge cases

- Placeholder repository URL formatting matches the repository's
  documentation style.
- Optional Docker is described only as optional and links out to
  T-011 (or the future `docker/README.md` if T-011 has been
  implemented).

## Tests

- Not applicable (documentation-only).

## Validation

```bash
pnpm validate
git diff --check
```

If a documentation link-checker exists in the repository, run it.
Otherwise, spot-check the new links manually and record the check
in the completion report.

## Documentation impact

- This is the documentation task; its output is the documentation.

## Stop conditions

- A required section would need to describe behavior that has not
  yet been implemented in the dependent tasks.
- A statement in an authoritative document (contract, T-001,
  delivery-workflow) needs to change to make this task coherent
  (stop; escalate).

## Completion report

- Files modified; link-check outcome; explicit confirmation: no
  code changes, no dependency additions, no evaluator/challenge
  branding, AI prompt disclosure preserved.
