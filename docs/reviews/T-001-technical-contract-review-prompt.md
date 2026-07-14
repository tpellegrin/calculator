# T-001 — Technical contract review prompt

**Intended reviewer:** a fresh model session or a separate human reviewer
that has **not** participated in authoring T-001 or the accepted
contract. Reading only this file and the linked authorities is
sufficient; do not consult prior implementation reasoning.

## Your role

You are an independent technical reviewer of the calculator REST
contract. You do not approve the contract. Your output is advisory and
will be adjudicated by the repository owner (Thiago).

Do **not** reopen owner-adjudicated product choices (operation scope,
percentage semantics, endpoint path, body limit, error taxonomy,
frontend interaction model, docker stance) unless you find a **genuine
contradiction or implementation blocker**.

## What to review

The accepted contract at:

- `docs/calculator-contract.md`

Cross-check against:

- `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`
  (Stage 5 — Owner adjudication is authoritative; Stages 2–4 are
  historical);
- `docs/architecture.md`;
- `docs/implementation-guide.md`;
- `docs/what-not-to-do.md`;
- `apps/api/README.md`;
- `apps/web/src/api/README.md`;
- `README.md`.

## Focus areas

Score each area for correctness, unambiguity, and implementability.

1. **Go arithmetic domain (§4, §5, §10).**
   - Are the seven operations, their arities, and edge cases fully
     specified without hidden implementer choices?
   - Are `power` edge cases (0^0, negative base with integer/non-integer
     exponent, negative exponent, 0^negative, overflow) each covered
     with an unambiguous outcome?
   - Are `math_domain` and `numeric_overflow` distinguishable from the
     domain layer without HTTP knowledge?
   - Is zero normalization defined in a single place with clear
     ownership?
2. **HTTP semantics (§6, §7, §9, §11).**
   - Are method/path/media-type/body-size gates specified in an
     enforceable order?
   - Is the strict-decoding policy (unknown fields, single value,
     duplicate-member handling) implementable with the Go standard
     library alone, as claimed?
   - Are all 12 error codes triggerable from an explicit rule and
     mapped to exactly one HTTP status?
3. **Numeric policy (§5).**
   - Does the contract avoid describing float64 results as exact real
     numbers?
   - Is the finite-value policy internally consistent between operand
     acceptance and result classification?
4. **Frontend API boundary (§13).**
   - Is the union of operations and error codes fully enumerable in
     TypeScript with no `any`?
   - Are cancellation, no-retry, and staleness rules implementable via
     `AbortController` and a local sequence token?
5. **Interaction and lifecycle (§14, §16).**
   - Is the physical-calculator state machine specified precisely
     enough for a lower-capability model to build without further
     product decisions?
   - Are pending/success/retryable/domain/cancellation states each
     unambiguous and mutually exclusive?
6. **Security and robustness (§20).**
   - Are body-size, decoding, and logging rules proportionate and
     enforceable?
   - Are the "no CORS", "no auth", "no persistence" constraints
     clearly bounded?
7. **Test ownership (§18) and coverage (§19).**
   - Does every behavior in §4–§16 have exactly one primary owning
     layer?
   - Is the real-server smoke test sufficiently scoped?

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
- Style edits that do not affect correctness or implementability.
- Rewrites of decision history in T-001 Stages 1–4.
- Suggestions to add new dependencies unless a blocker requires it,
  with explicit justification.

## Deliverable

Paste the report into a new file at
`docs/reviews/T-001-technical-contract-review.md` with a filled
"Review report format" section from `docs/reviews/README.md`.
