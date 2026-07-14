# T-001 — Frontend and product review prompt

**Intended reviewer:** a fresh model session or a separate human reviewer
that has **not** participated in authoring T-001 or the accepted
contract. Reading only this file and the linked authorities is
sufficient; do not consult prior implementation reasoning.

## Your role

You are an independent frontend and product reviewer of the calculator
contract. You do not approve the contract. Your output is advisory and
is adjudicated by the repository owner (Thiago).

Do **not** reopen owner-adjudicated product choices (operation scope,
percentage semantics, endpoint path, physical-calculator interaction,
no-history, no-repeated-equals, docker stance) unless you find a
**genuine contradiction or implementation blocker**.

## What to review

The accepted contract at:

- `docs/calculator-contract.md`

Cross-check against:

- `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`
  (Stage 5 — Owner adjudication is authoritative);
- `docs/frontend-foundation.md`;
- `docs/architecture.md`;
- `apps/web/src/api/README.md`;
- `apps/web/src/i18n/`, `apps/web/src/styles/`, `apps/web/src/components/`,
  `apps/web/src/containers/`;
- `README.md`.

## Focus areas

1. **Physical-calculator interaction (§14).**
   - Are the keys and their semantics fully enumerated (digits,
     decimal-separator, binary operators, `√`, `±`, `C`, `⌫`, `=`)?
   - Is chaining (successful result becomes first operand of next
     atomic request) unambiguous?
   - Are excluded interactions (free-form expressions, precedence,
     history, repeated-`=`, contextual `%`, `CE`) explicit?
2. **Request lifecycle and error surfacing (§16).**
   - Are pending, success, retryable failure, domain failure, and
     cancellation states each observable and mutually exclusive?
   - Is the "previous result remains visible while pending" behavior
     specified with enough precision to test?
   - Is the retry policy (manual only, no automatic) consistent
     between §13 and §16?
3. **Keyboard and accessibility (§15).**
   - Are the required key bindings sufficient for full keyboard
     operation across `en-US` and `pt-BR` (locale-aware decimal)?
   - Are live-region and error-identification requirements aligned
     with WCAG 2.2 (error identification and status)?
4. **Localization boundary (§17).**
   - Is the split "backend `error.code` is stable; frontend localizes
     by code" unambiguous?
   - Are `en-US`, `pt-BR`, and pseudo-locale parity requirements
     testable via existing tooling (`pnpm i18n:check`)?
5. **Numeric display (§5.5).**
   - Is "up to 15 significant digits + scientific notation for extreme
     magnitudes" implementable with `Intl.NumberFormat` alone, without
     new dependencies?
6. **Product scope.**
   - Are the seven operations sufficient and coherent as a first
     release?
   - Are the non-goals in §2 and §22 comprehensive enough to prevent
     scope creep in downstream tasks?
7. **Usability of the contract.**
   - Can a lower-capability implementation model build the state
     machine and UI from this contract alone, without further product
     decisions?

## Required report format

Return exactly this structure:

```
Verdict: Accept | Accept with corrections | Reject
Blockers:
  - ...
Major findings:
  - ...
Minor findings:
  - ...
Accepted design strengths:
  - ...
Required corrections:
  - ...
```

Every finding must include: severity (Blocker | Important | Optional),
location (§ reference or file:line), explanation, minimal recommended
correction. Do not attach code patches; recommendations must be textual.

## Out of scope for this review

- Product-scope re-litigation.
- Backend arithmetic details already covered by the technical review.
- Style edits that do not affect correctness, accessibility, or
  implementability.
- Suggestions to add new dependencies unless a blocker requires it,
  with explicit justification.

## Deliverable

Paste the report into a new file at
`docs/reviews/T-001-frontend-product-review.md` with a filled report
per `docs/reviews/README.md`.
