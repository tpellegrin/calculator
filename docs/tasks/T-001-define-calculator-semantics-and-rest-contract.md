# T-001 — Define calculator semantics and REST contract
- **Status**: In Review (awaiting independent technical-contract review and independent frontend/product review against `docs/calculator-contract.md`; owner adjudication of consequential decisions completed in Stage 5; Stage 6 reconciliation and accepted contract authored)
- **Depends on**: Monorepo foundation commit (`apps/web` frontend foundation, `apps/api` Go workspace boundary, `docs/` authorities).
- **Owner**: Thiago
- **Reviewer**: Two fresh-context reviewers (technical contract; frontend/product) — pending. See `docs/reviews/T-001-technical-contract-review-prompt.md` and `docs/reviews/T-001-frontend-product-review-prompt.md`.

## Objective

Produce the accepted authority that governs the calculator across the
repository, and only that authority. The completion artifact is a new
document at `docs/calculator-contract.md`. This task is
**design-and-decision only**: it evaluates alternatives, records
trade-offs, surfaces every consequential choice to Thiago, and — after
adjudication — freezes:

- the set of calculator operations and their semantics;
- the numeric model and observable numeric behavior;
- the REST transport (endpoint shape, methods, media types, request and
  response schemas, examples);
- the stable, machine-readable error taxonomy and HTTP status mapping;
- the conceptual Go domain boundary in `apps/api/internal/calculator`;
- the conceptual HTTP boundary in `apps/api/internal/httpapi`;
- the conceptual TypeScript integration boundary in
  `apps/web/src/api/`;
- UI-level behavioral assumptions (interaction model, request
  lifecycle, accessibility);
- the localization boundary between API and UI;
- the test-ownership matrix across layers;
- explicit non-goals.

No runtime code is produced by this task. No calculator behavior is
implemented. No dependencies are added.

## Context

The repository is in a "foundation only" state: the monorepo, frontend
foundation, i18n layer, transport-only frontend API client, and Go
workspace boundary exist, but **no arithmetic, no handlers, no
calculator UI, and no runtime server** exist yet. See
[`../architecture.md`](../architecture.md) and
[`../../apps/api/README.md`](../../apps/api/README.md).

Freezing the contract before implementation prevents:

- frontend/backend drift and duplicated arithmetic behavior;
- accidental API decisions being made inside handlers or React
  components;
- untestable or ambiguous edge cases;
- later tasks being blocked on questions that should have been settled
  once;
- reviewers having to guess the intended semantics.

The contract must be independently reviewable so that later
implementation tasks (Go domain, Go HTTP, frontend API integration,
frontend feature, integration tests) can proceed in parallel without
re-litigating semantics.

## Authoritative inputs

The implementer of this task must read and reconcile:

- [`../architecture.md`](../architecture.md) — target shape and
  principles (authoritative arithmetic on backend, no cross-language
  runtime package, no runtime fake backend, no monetary-ledger claim).
- [`../delivery-workflow.md`](../delivery-workflow.md) — phases,
  states, authority hierarchy.
- [`../ai-change-checklist.md`](../ai-change-checklist.md) — checklist
  for bounded changes.
- [`../implementation-guide.md`](../implementation-guide.md) — where
  behavior belongs across the monorepo.
- [`../what-not-to-do.md`](../what-not-to-do.md) — forbidden
  reintroductions.
- [`../frontend-foundation.md`](../frontend-foundation.md) — frontend
  adoption record and constraints.
- [`../ai-usage.md`](../ai-usage.md) — AI-use policy and prompt log.
- [`../tasks/README.md`](./README.md) — task format and naming.
- [`../../apps/api/README.md`](../../apps/api/README.md),
  `apps/api/go.mod`, and the package doc comments under
  `apps/api/internal/calculator` and `apps/api/internal/httpapi`.
- [`../../apps/web/src/api/README.md`](../../apps/web/src/api/README.md)
  and the current transport-only client (`client.ts`, `errors.ts`,
  `types.ts`).
- Root and workspace manifests (`package.json`, `pnpm-workspace.yaml`,
  `apps/web/package.json`) and CI configuration.
- The **Product requirements — source of truth** section below.

**Stop condition on inputs.** If, during execution, the implementer
discovers a contradiction between authoritative inputs, or a missing
clarification that a consequential decision depends on, they must
stop and report rather than silently pick a default. The implementer
must not reconstruct product requirements from memory or from the
AI's prior knowledge — the section below is the canonical statement.

## Product requirements — source of truth

The following statement is the product source of truth for T-001.
All accepted contract decisions must remain traceable to it.

> **Objective**
>
> Build a full-stack calculator application with a React frontend and
> a backend microservice. The frontend should consume the backend API
> to perform basic and advanced arithmetic operations. Focus on clean
> design, maintainable code, and testable architecture.
>
> **Requirements**
>
> *Functional*
>
> Operations:
>
> - Addition
> - Subtraction
> - Multiplication
> - Division
> - Optional: Exponentiation, Square Root, Percentage
>
> Frontend (React):
>
> - Intuitive UI for entering input and displaying results
> - Input validation and error handling
> - Responsive design with basic mobile support
>
> Backend (REST API):
>
> - Expose endpoints for calculator operations
> - Validate input and handle edge cases, including division by zero
>   and invalid data
> - Return results in JSON format
>
> *Non-functional*
>
> - Clean, readable, and idiomatic frontend and backend code
> - Unit tests covering key functionality for both layers
> - Documentation covering setup, API usage, and design rationale
> - Optional Dockerfile for full-stack deployment
>
> *Constraints*
>
> - Frontend: React, TypeScript preferred
> - Backend: Go preferred
>
> *Deliverables*
>
> - Git repository with frontend and backend code
> - README with setup instructions, API examples, and design decisions
> - Unit tests and coverage report
> - Optional Dockerfile to run frontend and backend together
>
> *Additional instructions*
>
> - AI tooling may be used
> - Target effort is approximately 2–4 hours
> - Prioritize correctness, clarity, and maintainability over extra
>   features
> - Share the repository link
> - Share prompts used during development

Interpretation rules for T-001:

- These requirements are the **product source of truth**. Every
  accepted contract decision must be traceable to a statement above,
  to a repository authority, or to an explicit Thiago adjudication.
- The optional operations (exponentiation, square root, percentage)
  remain **subject to explicit scope decisions** during this task.
  They are not automatically in or out of scope.
- The "approximately 2–4 hours" guidance influences **proportionality**
  — depth of analysis, number of alternatives seriously compared,
  amount of hardening, and volume of ancillary tooling — but does not
  excuse missing required behavior (the four required operations,
  input validation, edge-case handling, JSON responses, tests, or
  documentation).
- Transparent disclosure of AI prompts is part of the product
  requirements and must remain intact regardless of other
  proportionality decisions.

## Scope

This task, when moved to Ready and executed, will:

1. Inspect the repository, its authorities, and the product
   requirements captured above.
2. For each **consequential** decision category listed under
   **Required decisions**, produce:
   - the question, in one sentence;
   - credible options (typically 2–4);
   - trade-offs (correctness, testability, extensibility, complexity,
     consistency with repository principles);
   - a recommendation, with rationale;
   - the decision owner (implementer, or Thiago for consequential
     items);
   - a status (`Proposed`, `Accepted`, `Accepted with modification`,
     `Rejected`, `Deferred`);
   - the implication for later tasks (what code, tests, or docs it
     unlocks or constrains).

   Routine or low-risk decisions (see the rule below) may be recorded
   directly in the proposed contract with concise rationale, without a
   full matrix row.
3. Draft the proposed contents of `docs/calculator-contract.md`,
   including concrete request/response and error examples. During
   proposal, this draft lives inside this task file (or a clearly
   labeled **Proposed contract draft** section) — the authoritative
   file at `docs/calculator-contract.md` is not created yet.
4. Present all consequential decisions to Thiago in a compact
   **owner-review summary** grouped by: product semantics, numeric
   behavior, API, Go architecture, frontend behavior, testing and
   delivery.

**Owner-review checkpoint (mandatory stop).** The implementer **must
stop here** after producing:

- the repository and requirements inspection;
- the consequential-decision matrix;
- the proposed contract draft (clearly labeled *proposed*, not
  authoritative);
- the compact owner-review summary.

At this checkpoint the implementer must **not**:

- mark any consequential decision as `Accepted`;
- create `docs/calculator-contract.md`;
- edit any authority document outside this task file;
- proceed to fresh-context review or finalization.

Execution resumes only after Thiago adjudicates.

5. Record Thiago's adjudication verbatim in this task file.
6. Only after adjudication, create `docs/calculator-contract.md` as the
   accepted authority, clearly separating **accepted decisions**,
   **intentional deferrals**, **non-goals**, and **implementation
   implications**.
7. Undergo the two required fresh-context reviews defined under
   **Required reviews** below.
8. Reach `Implemented` only when no consequential decision is
   accidentally unresolved, all accepted decisions are reflected
   consistently across the contract and touched authority docs, no
   runtime code was introduced, and later tasks can be authored without
   guessing. Delivery-readiness review belongs to the final application
   stage, not this contract task, and T-001 is **not** self-declared
   `Validated` by the implementer.

**Matrix proportionality rule.** If a decision has only one credible
option under the repository’s frozen constraints (see
**Decisions already made**), it does not require a separate matrix
row. Record it directly in the proposed contract with a one-line
rationale. Consequential decisions still require owner adjudication.

## File scope

The following rules are unambiguous and override any other statement
in this task:

**During proposal and owner-review stages (up to and including the
owner-review checkpoint):**

Only these files may be changed:

- `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`

`docs/calculator-contract.md` **must not yet exist**. It may be created
only after Thiago's adjudication.

**After decisions are accepted:**

The following files may be created or receive minimal consistency
updates if the accepted contract requires it:

- `docs/calculator-contract.md` (created);
- `README.md`;
- `docs/architecture.md`;
- `docs/implementation-guide.md`;
- `apps/api/README.md`;
- `apps/web/src/api/README.md`.

Rules for those updates:

- update only links, status wording, or statements directly made
  obsolete by the accepted contract;
- do not broadly rewrite these documents;
- every additional file touched must be justified in the completion
  report;
- **no runtime or configuration files may be touched** (no code under
  `apps/web/src/**` other than the README noted above, no code under
  `apps/api/internal/**` or `apps/api/cmd/**`, no package manifests,
  no CI configuration, no Docker files).

## Out of scope

The following are **explicitly prohibited** by this task and must be
deferred to later, separately-authored tasks:

- Go arithmetic implementation (any code under
  `apps/api/internal/calculator` beyond the existing `doc.go`).
- Go HTTP handlers or request/response types (any code under
  `apps/api/internal/httpapi` beyond the existing `doc.go`).
- Go server startup, routing, or lifecycle wiring
  (`apps/api/cmd/server`).
- React calculator components or hooks
  (`apps/web/src/features/calculator/`).
- Frontend calculator API-client implementation, request/response
  types, or error decoding logic under `apps/web/src/api/`.
- Test implementations at any layer.
- Dockerfiles, Docker Compose, or end-to-end infrastructure.
- New dependencies (frontend or backend).
- OpenAPI, JSON Schema, or generated clients — unless this task first
  documents a concrete, evidence-based need and Thiago accepts it.
- A cross-language shared runtime package.
- A runtime fake REST backend.
- Any commit or push.
- Edits to any file outside the set explicitly permitted under
  **File scope**.

Illustrative payloads and small type signatures inside the contract
document are permitted; they are documentation, not implementation.

## Decisions already made

Repository authority has already frozen the following. This task
recognizes them as inputs and must not silently reopen any of them. If
this task believes one must change, it must stop, report the conflict,
and require Thiago's decision.

- Monorepo layout: `apps/web`, `apps/api`, `docs/`.
- Frontend is React + TypeScript; backend is Go.
- The frontend consumes the Go service over HTTP; transport security
  (HTTPS) is a deployment concern, not part of the application
  architecture.
- Authoritative arithmetic lives on the backend; the frontend does not
  duplicate arithmetic for operations owned by the API.
- The Go arithmetic domain (`internal/calculator`) is pure and must
  not import HTTP concerns; `internal/httpapi` is a thin adapter.
- All frontend network access goes through `apps/web/src/api/`.
- No runtime fake REST backend.
- No database, no authentication, no queues, no service discovery, no
  GraphQL.
- No cross-language shared runtime package until two real consumers
  justify one.
- No heavyweight monorepo tool (Nx, Turborepo, Bazel, Rush, Lerna).
- Frontend visual values come from theme tokens; user-facing copy from
  the i18n layer (`en-US`, `pt-BR`, `pseudo`).
- No `any` in TypeScript; use `unknown` and narrow.
- AI review output is advisory; Thiago is the only accepting authority.

## Decisions allowed

The task **may recommend** — but must not silently finalize without
Thiago's explicit adjudication — any of:

- optional operations (exponentiation, square root, percentage);
- percentage semantics;
- numeric representation and numeric edge-case behavior;
- negative-zero normalization;
- result rounding and display formatting boundary;
- endpoint shape (single resource vs. per-operation);
- request and success-response schemas;
- error envelope shape (project-owned vs. RFC 7807 problem details);
- error-code vocabulary;
- HTTP status mapping;
- Go domain API shape (pure function, service type, registry,
  interface);
- strict-decoding policy (`DisallowUnknownFields`, `json.Decoder`,
  body-size limits);
- server operational baseline (address, timeouts, graceful shutdown,
  CORS in local dev);
- UI interaction model (operation-driven form vs. keypad vs. hybrid);
- calculation history inclusion;
- retry, cancellation, and stale-response behavior;
- localization strategy for API-originated errors (codes vs. server
  strings);
- coverage thresholds and quality gates;
- implications for future Docker Compose and end-to-end tests.

All of the above must be surfaced explicitly in the review section.

## Required decisions

For each category below, produce the decision record described under
**Scope** (question, options, trade-offs, recommendation, owner,
status, implication).

### 1. Operation scope

- Required operations: addition, subtraction, multiplication,
  division.
- Optional candidates to evaluate: exponentiation, square root,
  percentage.
- For every accepted operation, the contract must define: stable
  operation identifier (locale-neutral), human meaning, formula,
  operand arity, operand order, at least two positive examples, at
  least one domain-invalid example, and expected boundary cases.
- Percentage is ambiguous. Compare at minimum: unary `x / 100`;
  binary "percentage of" (`a * b / 100`); calculator-key contextual
  behavior; omission from the first release. The implementer must not
  choose percentage semantics without an explicit Thiago decision.

### 2. Product interaction model

- Compare at least: operation-driven form, physical-calculator-style
  keypad, hybrid.
- Decide: how operations are selected; how unary vs. binary operations
  affect visible inputs; keyboard behavior; when validation appears;
  how results and errors are displayed; behavior during a pending
  request; whether a newer calculation supersedes or cancels an older
  one; whether calculation history is in scope; whether copy / reset /
  clear interactions are in scope.
- No final visual styling. No mockups unless required to resolve an
  interaction ambiguity.

### 3. Numeric representation

- Compare at minimum: Go `float64` with JSON numbers; fixed-decimal
  arithmetic; string-encoded decimal; integer / scaled representation.
- The numeric-policy decision must distinguish general calculator
  arithmetic from monetary or ledger arithmetic, and state explicitly
  which of the two this contract targets.
- Decide observable behavior for: accepted input number syntax;
  finite-values-only policy; NaN and infinity handling on input and
  output; overflow and non-finite results; negative zero on input and
  output; decimal precision limits; backend rounding rules (if any);
  frontend display formatting boundary; scientific notation; very
  large and very small values; equality expectations in tests; whether
  responses preserve raw operands; and an explicit statement about
  monetary suitability.
- Vague language such as "handle floating-point safely" is
  unacceptable. The contract must specify observable behavior.

### 4. Operation-specific edge cases

Produce explicit decisions for at least:

- Addition / subtraction / multiplication: overflow and non-finite
  result; negative and decimal operands; zero and negative zero.
- Division: division by positive zero; division by negative zero; very
  small nonzero denominator; non-finite result.
- Exponentiation (if accepted): `0^0`; negative base with fractional
  exponent; negative exponent; overflow; non-finite result; whether
  complex results are unsupported.
- Square root (if accepted): negative operand; negative zero; large
  operand; floating-point result.
- Percentage (if accepted): operand meaning and order; negative
  percentage; percentage above 100; zero values; display wording.

Do not prescribe implementation-level algorithms.

### 5. REST resource and endpoint design

- Compare at minimum: a single calculation resource endpoint (e.g.,
  `POST /v1/calculations`) versus one endpoint per operation.
- Justify the recommendation on: consistency, extensibility,
  validation duplication, API clarity, testability, REST semantics,
  and project scope.
- Decide: HTTP method; versioned path; singular vs. plural resource
  naming; request content type; response content type; health
  endpoint; CORS responsibility (application vs. dev proxy); local API
  base URL and how it aligns with `VITE_API_BASE_URL`; request-body
  size limit; behavior for method-not-allowed; behavior for
  unsupported media type; response cache policy; HTTP-idempotency
  stance for calculation requests; request-identifier or
  correlation-ID policy.
- Do not mandate enterprise infrastructure disproportionate to a small
  calculator service.

### 6. Request schema

- Compare at minimum an array-operand shape and an explicit-field
  shape, e.g.:

  ```json
  { "operation": "divide", "operands": [10, 4] }
  ```

  vs.

  ```json
  { "operation": "divide", "leftOperand": 10, "rightOperand": 4 }
  ```

- Address unary operations, extensibility to future operations,
  clarity, and validation cost.
- Decide: exact property names; requiredness; operation
  representation (string enum; case sensitivity); operand
  representation (JSON number vs. string); exact operand counts per
  operation; handling of empty arrays; `null`; strings that resemble
  numbers; additional properties; duplicate JSON members (see the
  proportionality note below); trailing JSON values; empty body;
  malformed JSON; body-size limit; content-type policy.
- Distinguish clearly: JSON syntax errors, transport / request-shape
  errors, and calculation-domain errors.

**Duplicate JSON members — proportionality note.** Go's standard
`encoding/json` decoder accepts duplicate object member names and
allows later values to replace earlier ones. Rejecting duplicates
requires additional parsing logic beyond the standard decoder.
T-001 must decide whether accepting documented standard-library
behavior is proportionate for this calculator, or whether strict
rejection is justified by a concrete client-correctness benefit that
outweighs the added complexity. Neither outcome is presumed. The
chosen behavior must be documented in the contract and covered by at
least one test in the ownership matrix. This task does not implement
a custom parser.

### 7. Success response schema

- Compare "result only" versus responses that include operation,
  operands, an expression string, metadata, timestamp, or a request
  ID. Prefer minimality unless additional data has a concrete use.
- Provide concrete examples for: a binary success, a unary success (if
  any unary operation ships), and percentage (if accepted).
- Decide: negative-zero normalization on output; JSON encoding of
  very large or very small values; whether formatted display strings
  belong in the API (default: no — localized display is the
  frontend's responsibility unless a decision explicitly justifies
  otherwise); whether the backend echoes normalized or original
  operands.

### 8. Error taxonomy

- Compare: a project-owned envelope, RFC 7807 problem details, and
  any other well-justified shape.
- Decide: error object structure; a stable machine-readable `code`;
  a human-readable `message` (and whether it is API-stable);
  optional `details` field; optional trace or request identifier;
  localization policy; internal-error exposure policy.
- Evaluate at least these situations and map each to a code:
  malformed JSON; empty body; trailing JSON; unknown property;
  invalid request shape; missing operation; unsupported operation;
  invalid operand representation; wrong operand count; duplicate
  JSON members (see decision 6); division by zero; negative square
  root; unsupported mathematical domain; result out of range or
  non-finite; request too large; unsupported media type; method not
  allowed; internal server error.
- Do not invent a code per parser implementation detail unless a
  concrete client need justifies it. The final code set must be
  small, coherent, and testable.

### 9. HTTP status policy

- Produce an explicit decision matrix mapping each error situation
  above to an HTTP status. Evaluate at minimum: `200`, `400`, `405`,
  `413`, `415`, `422`, `500`.
- Provide clear criteria distinguishing: malformed transport input,
  structurally invalid requests, semantically invalid calculations,
  and server faults. Favor consistency over theoretical purity.
- Decide response headers where relevant: `Content-Type`; `Allow`
  for method errors; cache-control if applicable.

### 10. Go domain boundary (`apps/api/internal/calculator`)

- Compare alternatives: pure function; concrete calculator service;
  operation registry; interface-based service.
- Recommend based on: idiomatic Go, testability, simplicity, absence
  of persistence or external dependencies, and later HTTP integration
  ergonomics.
- Define the conceptual ownership of: operation type; operand type;
  calculation result type; typed domain errors; arity validation;
  finite-value validation; operation-specific validation;
  negative-zero normalization (if adopted).
- The domain must not know about HTTP, JSON, status codes, localized
  messages, frontend types, headers, or routers.
- Do not invent interfaces for dependency injection when no consumer
  needs them. Small illustrative Go signatures are allowed in the
  contract to disambiguate alternatives, but must be marked
  non-final until accepted.

### 11. Go HTTP boundary (`apps/api/internal/httpapi`)

- Define responsibilities: routing; body-size limiting; content-type
  handling; strict JSON decoding (e.g., `json.Decoder`,
  `DisallowUnknownFields`, single-value enforcement); request DTOs;
  translation to domain input; mapping domain errors to API errors
  and HTTP statuses; response encoding; method handling; health
  endpoint; panic recovery policy; server-logging boundary.
- Keep handler concerns separate from `cmd/server` bootstrap.
- Do not design a framework where the standard library suffices.

### 12. Server lifecycle and operational baseline (`apps/api/cmd/server`)

T-001 decides only the aspects that affect cross-layer integration or
observable behavior. Exact values and mechanics of the Go server
process are owned by a later Go server task.

**Decided in T-001** (cross-layer or externally observable):

- local API base URL convention;
- default server port;
- frontend `VITE_API_BASE_URL` alignment;
- request-body size limit;
- health endpoint purpose and response shape;
- development CORS strategy;
- whether calculation responses are cacheable.

**Principles stated in T-001, exact values deferred:**

- server timeouts must exist and be proportional;
- shutdown must be graceful;
- internal errors must not leak to clients;
- logging must remain proportional.

**Deliberately deferred to the later Go server task:**

- exact `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`,
  `IdleTimeout` values;
- exact graceful-shutdown duration;
- detailed logging format (structured vs. standard);
- panic-recovery middleware implementation;
- server-composition and bootstrap details.

Choices must be proportional. No production observability, tracing
stack, or deployment architecture without a concrete need.

### 13. Frontend API boundary (`apps/web/src/api/`)

- Define TypeScript-facing semantics separately from Go types, over
  the same contract:
  - operation identifier union;
  - request type;
  - response type;
  - API error-code union;
  - structured API error type (built on top of the existing
    `ApiError`);
  - network error;
  - invalid / unexpected response;
  - request cancellation;
  - response validation strategy (runtime narrowing of untrusted
    responses);
  - whether code generation is justified — default: no.
- Strongly discourage a cross-language shared runtime package.
- Do not implement TypeScript types in this task. Illustrative types
  may appear in the accepted contract only.

### 14. Request lifecycle

- Decide: automatic retries (default: none for deterministic
  calculator requests); manual retry affordance; abort behavior; stale
  response suppression; duplicate submissions; backend unavailable;
  request timeout; preservation of inputs after failure; whether a
  prior result is cleared when a new request begins; whether a
  previous successful result remains visible while loading.
- The decision must be testable by the frontend behavior tests defined
  in Section 18.

### 15. Accessibility contract

- Define product-level, testable accessibility acceptance criteria,
  including at minimum: every input has a programmatic label; errors
  identify the affected field or the failed request; errors are not
  communicated by color alone; the result and asynchronous error
  status are announced without unnecessary focus movement; keyboard
  users can complete every operation; focus remains predictable after
  submission; loading state is programmatically available;
  unary/binary transitions do not create confusing hidden controls;
  reduced-motion preferences are respected if animation is ever
  introduced; mobile touch targets are reasonable.
- Do not prescribe final ARIA attributes without considering the
  eventual component structure.

### 16. Localization boundary

- The API contract must remain locale-neutral. Do not translate:
  operation identifiers, error codes, JSON property names, or enum
  values.
- Decide: supported user-facing locales for the calculator feature
  (aligned with the existing `en-US`, `pt-BR`, `pseudo` layer);
  translation of operation labels; error-message localization
  strategy — server strings passed through vs. client-side mapping
  from stable error codes to localized copy (prefer stable codes as
  the frontend's decision input); number formatting; decimal
  separators; grouping separators.
- Confirm that stable, untranslated operation identifiers and error
  codes are the only cross-layer vocabulary.

### 17. Security and robustness

- Proportional decisions only, for: body-size limit; strict decoding;
  unsupported methods; content-type enforcement; error-leakage
  policy; panic containment; server timeouts; CORS scope in local
  development; input complexity limits; exponentiation abuse or
  computational bounds; response cache behavior.
- Do not introduce authentication, authorization, rate-limiting
  infrastructure, or distributed controls without a documented
  requirement.
- Distinguish relevant hardening from intentionally deferred
  production concerns.

### 18. Test ownership matrix

Define which layer proves each behavior. The task produces the matrix;
it does **not** produce the tests. At minimum:

- **Go domain tests** — accepted operations; formulas; arity;
  decimals; negatives; zero behavior; operation-specific errors;
  non-finite inputs and results; any normalization rules.
- **Go HTTP handler tests** — valid requests; malformed JSON; empty
  body; unknown fields; trailing JSON; content-type handling;
  oversized body; method handling; error / status mapping; response
  headers; health endpoint.
- **Frontend API tests** — request serialization; response parsing;
  structured API errors; network errors; cancellation; invalid server
  response.
- **Frontend behavior tests** — operation switching; unary vs. binary
  input handling; input validation; loading; success; server error;
  network failure; retry behavior; keyboard behavior; status
  announcement.
- **Full-stack integration tests** — at least one successful required
  operation; division by zero; one optional or unary operation if
  shipped; frontend against the real Go service.

### 19. Coverage and quality expectations

- Recommend meaningful quality targets without optimizing for
  vanity metrics.
- Address: Go coverage reporting; frontend coverage reporting; whether
  thresholds are justified and at what level; behavior over line
  coverage; CI gates (formatting, linting, type checking, build,
  tests); whether contract examples are verified against the
  implementation later.
- Do not freeze an arbitrary high percentage without rationale.

### 20. Explicit non-goals

The contract must end with a non-goals section that at minimum
evaluates and — for this release — likely excludes: authentication;
database; server-side calculation history; user accounts;
monetary-ledger guarantees; GraphQL; WebSockets; queues; Redis;
plugin system; arbitrary-precision arithmetic unless deliberately
selected; cross-language runtime package; runtime fake backend;
Kubernetes; service discovery; distributed tracing stack; complex
state-management framework; heavyweight monorepo tooling.

Distinguish "not needed" from "forbidden forever".

## Required implementation

This task produces documentation only. The eventual implementer works
in the following stages.

**Stage 1 — Repository and requirement inspection.** Read all
authoritative inputs, including the **Product requirements — source
of truth** section. Identify unresolved decisions, contradictions,
and missing inputs.

**Stage 2 — Decision matrix.** For every **consequential** category
in **Required decisions**, produce a row in a table with columns:
`Decision | Options | Trade-offs | Recommendation | Owner | Status`,
where `Status ∈ {Proposed, Accepted, Accepted with modification,
Rejected, Deferred}`. Apply the **Matrix proportionality rule**:
single-credible-option decisions are recorded directly in the
proposed contract with concise rationale and do not require a matrix
row. Consequential decisions may only be `Accepted` after Thiago's
input.

**Stage 3 — Proposed contract draft.** Prepare the proposed contents
of the future `docs/calculator-contract.md`, including concrete
examples and decision rationale, **inside this task file** (or a
clearly-labeled proposed-draft section within it). Do not create the
authoritative contract file. Do not write runtime code.

**Stage 4 — Owner-review summary.** Present the unresolved and
consequential decisions in a compact review section grouped as:
product semantics, numeric behavior, API, Go architecture, frontend
behavior, testing and delivery. Do not hide choices inside a long
document.

**Stage 4a — Owner-review checkpoint (mandatory stop).** After
Stages 1–4, the implementer stops execution and waits for Thiago's
adjudication. See the **Owner-review checkpoint** clause in **Scope**
for the full list of what must not be done at this point. The task
remains in progress; no consequential decision is `Accepted` yet and
`docs/calculator-contract.md` does not yet exist.

**Stage 5 — Adjudication.** Thiago accepts, modifies, rejects, or
defers each consequential recommendation. The implementer records
the adjudication verbatim in this task file.

**Stage 6 — Final authority document.** After adjudication, create
`docs/calculator-contract.md`. It must clearly separate: accepted
decisions, intentional deferrals, non-goals, and implementation
implications.

**Stage 7 — Fresh-context reviews.** See **Required reviews** below.
Each reviewer must inspect the accepted contract, not only the
completion report. The implementer must not act as the only reviewer.

**Stage 8 — Final corrections and validation.** Resolve findings.
Validate documentation links and cross-references. Confirm no
consequential decision remains accidentally unresolved. Confirm
architecture and implementation guides remain consistent with the new
contract. Confirm no runtime code changed. Mark T-001 `Implemented`
only when all of the above holds. The implementer does not
self-declare `Validated`; delivery-readiness review belongs to the
final application stage.

## Required reviews

Two fresh-context reviews are required, each performed from a new
session or by a separate reviewer against the accepted contract
(not only the completion report):

1. **Technical contract review** — covers:
   - Go domain shape and boundaries;
   - HTTP semantics (methods, statuses, headers, media types);
   - JSON behavior (decoding strictness, duplicates, edge cases);
   - numeric edge cases;
   - robustness and security proportional to a small calculator.
2. **Frontend and product review** — covers:
   - interaction model;
   - accessibility;
   - localization boundary;
   - request lifecycle;
   - scope and usability against the product requirements.

**Final owner adjudication.** Thiago reviews and resolves findings
from both reviews. The implementer's own self-verification is
required but does **not** substitute for a fresh-context review.

A separate delivery-readiness review belongs to the final
application stage, not this contract task.

### Research requirements

Contract decisions must be based on primary technical sources where
relevant. At minimum consult current primary documentation for:

- Go JSON decoding behavior (`encoding/json`, `json.Decoder`,
  `DisallowUnknownFields`, number handling);
- Go `net/http` server semantics (timeouts, shutdown, `http.MaxBytesReader`);
- JSON number constraints (RFC 8259) and interoperability guidance
  (RFC 7493);
- HTTP status semantics (RFC 9110);
- WCAG guidance on accessible form errors and asynchronous status
  messages (WAI-ARIA `aria-live`, WCAG 2.2 error identification and
  status).

The task must not embed long research summaries or external
quotations. The completion report must list sources consulted, the
decisions each source materially influenced, and any place where
repository constraints intentionally differ from a general
recommendation.

## Edge cases

The contract must state observable behavior for every edge case listed
under decisions 4, 6, 7, 8, and 9. In particular, ambiguities that
must not be left to individual implementer discretion:

- percentage semantics if percentage ships;
- negative-zero on input and output;
- non-finite intermediate or final results;
- oversized body;
- duplicate JSON keys and trailing JSON;
- unknown properties;
- non-canonical operand types (strings, `null`, arrays where a number
  is expected);
- method-not-allowed and unsupported-media-type responses;
- request cancellation and stale-response suppression on the
  frontend.

## Tests

This task does not produce tests. It defines the test-ownership
matrix in decision 18 and the coverage stance in decision 19. Every
accepted behavior in the contract must map to at least one owning
layer in the matrix.

## Validation

Because this task is documentation-only:

- `git diff --check` must be clean.
- Up to and including the owner-review checkpoint, the only file
  modified is
  `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`.
  `docs/calculator-contract.md` is created only at Stage 6, after
  adjudication. Any additional files touched under Stages 6–8 must
  follow the **File scope** rules and be justified in the completion
  report.
- Existing repository validation may be exercised only insofar as
  documentation changes could affect it (link checks, i18n parity is
  unaffected). Do not force unrelated runtime work to make validation
  symmetrical.
- Repository formatting conventions for Markdown must be followed
  where enforced.
- All internal links in the contract and in this task file must
  resolve.
- Operation identifiers must appear consistently throughout the
  contract; every accepted operation must have arity, formula,
  examples, and error mapping; every error code must appear in the
  status matrix; every request and response example must match the
  respective schema; Go and TypeScript conceptual types must
  represent the same contract; frontend behavior must be consistent
  with error and lifecycle decisions; testing responsibilities must
  cover every accepted behavior; non-goals must not contradict
  accepted scope; `docs/architecture.md` and
  `docs/implementation-guide.md` must remain consistent (update them
  only if the accepted contract requires it, and only within their
  existing boundaries).

## Documentation impact

See **File scope** for the authoritative list. In summary:

- **Created** (Stage 6, post-adjudication): `docs/calculator-contract.md`.
- **Possibly touched** (only if the accepted contract requires it, and
  only to remove now-obsolete "not yet frozen" wording, adjust status
  wording, or add a link):
  - `docs/architecture.md`;
  - `docs/implementation-guide.md`;
  - `apps/api/README.md`;
  - `apps/web/src/api/README.md`;
  - `README.md` status section.
- **Not touched** by this task: any runtime or configuration file,
  including anything under `apps/web/src/features/`,
  `apps/api/internal/**` (beyond the existing `doc.go` files, which
  must not be edited here), `apps/api/cmd/server/main.go`, package
  manifests, CI configuration, or Docker files.

Every file touched outside `docs/tasks/T-001-...md` and
`docs/calculator-contract.md` must be individually justified in the
completion report and limited to reflecting decisions that were
adjudicated in this task.

## Stop conditions

Stop and report — do not "choose a reasonable default" — when:

- an authoritative input contradicts another, or a clarification
  required by a consequential decision is missing;
- repository authorities conflict;
- a consequential product decision requires Thiago;
- numeric semantics cannot be made unambiguous;
- percentage remains undefined while included in scope;
- a proposed API cannot represent every accepted operation coherently;
- a decision would require adding a dependency not yet approved;
- the design begins to drift into runtime implementation;
- a cross-language mismatch cannot be resolved through documentation
  alone;
- a fresh-context reviewer finds a blocker requiring a product
  decision;
- moving forward would require editing files outside the sets
  permitted by **File scope**.

**Mandatory owner-review checkpoint stop.** Regardless of any other
condition, execution must stop at the owner-review checkpoint (after
Stages 1–4) and remain stopped until Thiago has adjudicated the
consequential decisions. See **Scope** and **Stage 4a**.

## Completion report

The eventual completion report for this task must include:

**Summary.** What authority was created and what it now governs.

**Decisions accepted.** Grouped by: operations; numeric policy; API;
errors; backend; frontend; accessibility; tests; non-goals.

**Decisions deferred.** For each: reason; owner; the task or event
that resolves it; whether it blocks implementation.

**Alternatives rejected.** Only consequential alternatives, with
concise rationale.

**Files created or modified.** Exact paths.

**Research sources.** Primary sources consulted and the decisions
they influenced.

**Review outcomes.** For each of the two required fresh-context
reviews (technical contract review; frontend and product review):
verdict; blocker findings; accepted findings; rejected findings;
modifications made. Confirm the implementer did not act as the only
reviewer.

**Validation.** Commands run and their results.

**Implementation readiness.** State whether the accepted contract is
sufficient to author later tasks (Go domain, Go HTTP, frontend API
integration, frontend feature, integration tests) without guessing.

**Confirmation.** Explicitly confirm:

- no calculator runtime behavior was implemented;
- no Go handler was implemented;
- no React calculator feature was implemented;
- no dependency was added;
- no runtime fake backend was added;
- no commit or push occurred unless separately requested.

## Execution record

> **Execution phase:** Stages 1–4 only (owner-review checkpoint).
> All consequential recommendations below remain **Proposed** until
> Thiago adjudicates them. `docs/calculator-contract.md` has not been
> created. No runtime code, dependency, commit, or push occurred.

### Stage 1 — Repository and requirements inspection

#### Repository state

- **Monorepo foundation commit exists.** `git log` shows
  `9212a9b chore: init Calculator monorepo foundation` followed by
  `a6a80be docs: add calculator contract design task`. Working tree
  clean at start.
- **Frontend foundation** (`apps/web`) present per
  [`docs/frontend-foundation.md`](../frontend-foundation.md) and
  [`docs/architecture.md`](../architecture.md): React + TypeScript
  shell (`containers/App.tsx`) composing `ThemeProvider`,
  `I18nProvider`, and `ErrorBoundary`; theme tokens under
  `src/styles/themes/`; i18n layer with locales `en-US`, `pt-BR`,
  `pseudo`; reusable primitives (`Button`, `Box`, `Flex`, `Text`,
  `Form/Input`, `LabeledInputField`, `ErrorBoundary`); Vitest +
  Testing Library setup; no router, no data-fetching library, no
  auth, no state manager.
- **Frontend API boundary** (`apps/web/src/api/`) is transport-only:
  - `client.ts` — thin `fetch` wrapper, `VITE_API_BASE_URL`,
    `AbortSignal` support, **no retries**, same-origin fallback,
    empty-body → `null`, non-2xx → `ApiError('apiError', …)`
    carrying parsed body.
  - `errors.ts` — `ApiError` class with `ApiErrorKind ∈
    {network, aborted, invalidResponse, apiError, unknown}` and
    optional `status`, `body`, `cause`.
  - `types.ts` — `HttpMethod`, `Json`, `RequestOptions` only. No
    calculator-specific types.
  - README states no runtime fake backend, no TanStack Query, no
    retries.
- **Go workspace** (`apps/api`) is boundary-only:
  - `go.mod`: `module calculator/apps/api`, `go 1.22`.
  - `internal/calculator/doc.go`, `internal/httpapi/doc.go` — package
    docs only (no exported symbols).
  - `cmd/server/main.go` — placeholder that prints an
    "not yet implemented" message to stderr and exits 0; does not
    open a port.
- **i18n support**: `en-US` (base), `pt-BR`, `pseudo`. Parity check
  via `pnpm --filter @calculator/web i18n:check`. No user-facing
  language selector.
- **Tests and CI foundations**: Vitest + Testing Library on the
  frontend; `pnpm validate` runs format, lint, stylelint, typecheck,
  i18n parity, tests. Go workspace validates with `gofmt`, `go vet`,
  `go build`, `go test`. No cross-repo integration harness yet.
- **Placeholders that remain**: `apps/api/internal/calculator/doc.go`,
  `apps/api/internal/httpapi/doc.go`, `apps/api/cmd/server/main.go`,
  and the placeholder `<main>` in `apps/web/src/containers/App.tsx`.
- **Absence of runtime calculator implementation confirmed**: no
  handlers, no arithmetic, no request/response types, no calculator
  feature directory.

#### Requirement traceability

Mapping from the product **source-of-truth** section (lines 100–158
above) to the major contract concerns this task must address:

| Product requirement | Contract concern | Where addressed |
| --- | --- | --- |
| Addition, subtraction, multiplication, division | Required operation scope, arity, formulas, examples, invalid-domain cases | Stage 2 row 1; Stage 3 §2, §5–§7 |
| Optional: exponentiation, square root, percentage | Optional-operation scope + percentage semantics | Stage 2 rows 1, 2; Stage 3 §2 |
| Intuitive UI, input validation, error handling | Frontend interaction model, error surfacing, request lifecycle, accessibility | Stage 2 rows 21, 23, 24, 25; Stage 3 §12, §13, §14 |
| Responsive design, mobile support | Accessibility / interaction model (touch targets, keyboard) | Stage 3 §13 |
| REST endpoints, validate input, edge cases incl. div-by-zero, JSON responses | Endpoint structure, request validation, error taxonomy, HTTP status policy | Stage 2 rows 8–17; Stage 3 §4–§8 |
| Clean, idiomatic Go and TS code | Go domain shape, Go HTTP boundary, frontend API boundary | Stage 2 rows 18, 26; Stage 3 §9–§11 |
| Unit tests covering key functionality | Test-ownership matrix | Stage 2 row 29; Stage 3 §15 |
| Coverage report | Coverage-threshold policy | Stage 2 row 27; Stage 3 §16 |
| Setup/API/design documentation | Post-adjudication authority updates (out of Stage 1–4 scope) | Stage 3 §1 |
| Optional Docker | Docker scope | Stage 2 row 28; Stage 3 §18 |
| ~2–4 hour target effort | Proportionality of scope, tests, hardening | Woven throughout; Stage 3 §17, §18 |
| Prompt disclosure | AI-usage record | Preserved via [`../ai-usage.md`](../ai-usage.md); out of contract scope |

#### Authority findings

- **Constraints already frozen** (see task §"Decisions already made"
  and `docs/architecture.md`): monorepo layout; React+TS frontend and
  Go backend; HTTP transport (HTTPS is a deployment concern);
  authoritative arithmetic on backend, no client duplication; pure
  `internal/calculator`, thin `internal/httpapi`; all network access
  through `apps/web/src/api/`; no runtime fake backend; no DB, auth,
  queues, service discovery, GraphQL; no cross-language shared
  runtime package; no heavyweight monorepo tool; theme tokens + i18n
  layer (`en-US`, `pt-BR`, `pseudo`); no `any` in TS; Thiago is the
  sole accepting authority.
- **Consequential questions still unresolved** (surfaced in Stage 2):
  optional-operation scope; percentage semantics; numeric
  representation; finite / negative-zero / rounding policy; endpoint
  structure and path/versioning; request schema shape;
  success-response shape; strict decoding and duplicate-member
  policy; content-type policy; error envelope + code granularity +
  HTTP status mapping; Go domain shape; health endpoint contract;
  CORS strategy; interaction model; history scope; retry;
  cancellation / stale-response behavior; API-error localization
  strategy; runtime response validation on the frontend; coverage
  threshold policy; Docker scope; integration-test scope.
- **Tension between completeness and proportionality**: the product
  target effort is ~2–4 h and prioritizes correctness/clarity over
  extra features, while T-001 is deliberately exhaustive. The
  proposed contract handles this by keeping the surface small
  (single endpoint, small error vocabulary, no history, no retries,
  no request IDs, no observability stack) and by placing optional
  operations behind an explicit adjudication.
- **Missing input**: none blocking. The product source-of-truth
  section is canonical; all remaining ambiguities are the
  consequential decisions listed in Stage 2 and are for Thiago.
- **No authority conflict detected.** No prior contract exists at
  `docs/calculator-contract.md`; nothing frozen elsewhere
  contradicts the proposed direction.

### Stage 2 — Consequential-decision matrix

> **Reconciliation notice.** The recommendations in this matrix are the
> pre-adjudication proposals. They are retained here as decision history.
> Wherever they conflict with the owner adjudication in **Stage 5**, Stage 5
> governs and the recommendation in this table is **superseded**.
>
> Concretely, the following Stage 2 recommendations are superseded by
> Stage 5 and must not be used to drive downstream work:
>
> - **D01** — Stage 5 ships all seven operations (`add`, `subtract`,
>   `multiply`, `divide`, `power`, `sqrt`, `percentage`).
> - **D02** — Stage 5 defines `percentage(base, rate) = base * rate / 100`
>   (binary “percentage of”), not omitted, not contextual.
> - **D08 / D09** — Endpoint is `POST /api/v1/calculations` (with the
>   `/api` prefix).
> - Body limit is `16 KiB`, not `1 MiB`.
> - The error taxonomy includes `not_found`; per-operation numeric errors are
>   split into `math_domain` and `numeric_overflow`.
> - Frontend display uses **up to 15 significant digits** (not a fixed
>   maximum-fraction-digits policy) and scientific notation for extreme
>   magnitudes.
>
> Rationales below are compressed; the fuller argument (observable behavior,
> rejected alternatives, later-task impact) lives in Stage 3 and — for the
> accepted decisions — in Stage 5.

| ID | Decision | Credible options | Key trade-offs | Recommendation | Owner | Status | Later-task implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | Optional-operation scope | (a) required 4 only; (b) required 4 + `sqrt`; (c) required 4 + `sqrt` + `power`; (d) all three optionals incl. `percentage` | More operations = more edge cases, more tests, more ambiguity (esp. `percentage`); fewer = smaller but less impressive submission | **(b)** required 4 + `sqrt` (unary, exercises unary path without ambiguity). `power` deferred; `percentage` deferred (ambiguous semantics) | Thiago | Proposed | Fixes operation union in Go and TS; drives arity handling and unary-input UI |
| D02 | Percentage semantics (if D01 changes to include it) | (a) unary `x/100`; (b) binary `a*b/100`; (c) contextual calculator-key behavior; (d) omit | Contextual (c) is UI-coupled and hides math on the server; (a) and (b) diverge in user mental models; (d) removes ambiguity entirely | **(d)** omit from first release; revisit only with a concrete user story | Thiago | Proposed | If (a)/(b) accepted, adds an operation + tests + i18n copy |
| D03 | Numeric representation | (a) Go `float64` + JSON numbers; (b) fixed decimal; (c) string-encoded decimal; (d) big.Rat/big.Float | (b–d) require a decimal library or hand-rolled precision, disproportionate for a calculator; (a) is idiomatic, native to JSON | **(a)** IEEE-754 `float64` on the wire as JSON numbers; **explicitly not monetary** | Thiago | Proposed | Constrains rounding, negative-zero, and non-finite rows below |
| D04 | Finite-value policy | (a) accept any JSON number, reject non-finite results; (b) reject non-finite inputs on request (impossible in strict JSON anyway) and reject non-finite results; (c) allow `±Infinity/NaN` via string extensions | JSON per RFC 8259 cannot represent `NaN`/`±Infinity`; option (c) requires a non-standard extension | **(b)** operands must be finite JSON numbers; results must be finite — non-finite intermediate/final results map to a domain error | Thiago | Proposed | Adds `numeric_overflow` / `not_finite` domain error; drives test cases |
| D05 | Negative-zero policy | (a) preserve `-0` on input and output; (b) normalize `-0` to `+0` in responses only; (c) normalize both inputs and outputs | JS `JSON.stringify(-0) === "0"`, so `-0` rarely appears on the wire; preserving is surprising in a UI | **(b)** accept `-0` as input (equivalent to `0` for domain logic), **normalize `-0` to `0` on output** | Thiago | Proposed | Small normalization step in HTTP encoding; test in both Go domain and HTTP layer |
| D06 | Backend rounding policy | (a) no rounding — return raw `float64`; (b) round to N decimals; (c) round only on display | (b) hides floating-point reality; (c) is the frontend's job; (a) keeps backend honest | **(a)** no backend rounding; return the exact `float64` result. Precision caveat documented | Thiago | Proposed | Frontend owns display formatting; test comparisons use tolerance |
| D07 | Frontend number-formatting policy | (a) raw `toString`; (b) `Intl.NumberFormat` per active locale, sensible max fraction digits; (c) fixed 2 decimals | Calculators show human-readable numbers; (a) leaks `1.7976931348623157e+308`; (b) integrates with i18n | **(b)** `Intl.NumberFormat` with locale from i18n, `maximumFractionDigits` around 12; show raw exponent form only when magnitude demands it | Thiago | Proposed | Adds a small display helper; owned by frontend feature |
| D08 | Endpoint structure | (a) single `POST /v1/calculations` with `operation` field; (b) one endpoint per operation (`/v1/add`, etc.); (c) `POST /v1/calculate` (verb URL) | (b) duplicates validation and doesn't extend cleanly to new ops; (c) is unRESTful; (a) is a single resource with a clear payload | **(a)** single calculation resource | Thiago | Proposed | Fixes routing shape in `httpapi`; keeps frontend API to one function |
| D09 | Endpoint path and versioning | (a) `POST /v1/calculations`; (b) unversioned `POST /calculations`; (c) header-based versioning | Additive changes remain possible under path prefix; header versioning is heavy for a small app | **(a)** `POST /v1/calculations` (versioned prefix from day one) | Thiago | Proposed | Frontend calls `/v1/calculations`; future breaking changes bump `/v2/` |
| D10 | Request schema | (a) `{ operation, operands: [a, b?] }` array; (b) `{ operation, left, right }` explicit; (c) polymorphic per op | (a) is uniform across unary + binary + future ops; (b) needs schema variants for unary; (c) fragments contract | **(a)** array-operand shape — length 1 for unary, 2 for binary | Thiago | Proposed | Ties Go DTO, TS request type, and validation logic |
| D11 | Success-response schema | (a) `{ result }` only; (b) `{ result, operation, operands }` echoed; (c) include timestamp/id/metadata | (b) helps late-response correlation and testing; (c) is overkill for a stateless deterministic op | **(b)** `{ operation, operands, result }` — echoes the normalized request plus the numeric result. No timestamp, no id | Thiago | Proposed | Test fixtures and frontend types depend on this shape |
| D12 | Strict unknown-field handling | (a) `json.Decoder.DisallowUnknownFields()`; (b) tolerate unknown fields; (c) reject only in test builds | Strict rejection catches client typos early and keeps contract explicit; extra strictness cost is negligible | **(a)** enable `DisallowUnknownFields()` — unknown fields return `invalid_request` (`400`) | Thiago | Proposed | Handler decoding path; adds an HTTP-layer test |
| D13 | Duplicate JSON-member behavior | (a) accept stdlib default (last-value wins); (b) reject via custom parser; (c) accept but document as undefined | Per T-001 proportionality note, (b) requires custom parsing; (a) is documented stdlib behavior; (c) invites surprises | **(a)** accept stdlib behavior (last value wins) and **document it explicitly**; no custom parser | Thiago | Proposed | One test proving the documented behavior; called out in contract §5 |
| D14 | Request content-type policy | (a) require `Content-Type: application/json` (with optional `; charset=utf-8`); reject others with `415`; (b) sniff body; (c) accept any type if body parses | (a) is standard, cheap; (b/c) hides client bugs | **(a)** require `application/json`; empty body → `invalid_request` (`400`); wrong type → `415` | Thiago | Proposed | Handler pre-check; documented in error table |
| D15 | Error-envelope model | (a) project-owned `{ error: { code, message } }`; (b) RFC 7807 problem details; (c) `{ code, message }` at top level | 7807 adds `type`, `title`, `status`, `detail`, `instance` fields we don't need; (a) is minimal, coherent with existing `ApiError` on the frontend | **(a)** project-owned envelope: `{ "error": { "code": "…", "message": "…" } }`; no `details` unless a future need | Thiago | Proposed | TS `ApiError` narrowing decodes `body.error.code` |
| D16 | Error-code granularity | (a) small stable set (~8 codes); (b) one code per parser detail; (c) HTTP status only | (a) is coherent with i18n mapping; (b) is code sprawl; (c) loses machine-readable domain distinction | **(a)** codes: `invalid_json`, `invalid_request`, `unsupported_operation`, `invalid_operands`, `division_by_zero`, `math_domain`, `numeric_overflow`, `payload_too_large`, `unsupported_media_type`, `method_not_allowed`, `internal_error` | Thiago | Proposed | Fixes i18n key set on the frontend; anchors HTTP-status matrix |
| D17 | HTTP status policy | Map each code to a status: `invalid_json`→`400`, `invalid_request`→`400`, `unsupported_operation`→`422`, `invalid_operands`→`422`, `division_by_zero`→`422`, `math_domain`→`422`, `numeric_overflow`→`422`, `payload_too_large`→`413`, `unsupported_media_type`→`415`, `method_not_allowed`→`405` (with `Allow: POST`), `internal_error`→`500` | 400 vs 422 boundary: 400 for malformed/unrecognizable requests; 422 for well-formed requests that fail domain rules | **Adopt matrix as above.** `Allow` header on 405; `Content-Type: application/json; charset=utf-8` on every response | Thiago | Proposed | HTTP-layer tests; frontend maps by `code`, not by status |
| D18 | Go domain API shape | (a) small package-level functions returning `(float64, error)`; (b) `Calculator` struct with method set; (c) operation registry / plugin interface; (d) interface-based service | (b–d) are speculative until a second consumer exists; (a) is idiomatic Go for a stateless pure package | **(a)** pure package-level `Calculate(op Operation, operands []float64) (float64, error)` with typed sentinel errors (`ErrDivisionByZero`, `ErrMathDomain`, `ErrNumericOverflow`, `ErrInvalidOperands`, `ErrUnsupportedOperation`) | Thiago | Proposed | Constrains Go tests; keeps package small |
| D19 | Health endpoint contract | (a) `GET /v1/health` returning `{ "status": "ok" }` with `200`; (b) no health endpoint; (c) `GET /healthz` unversioned | Useful for Docker/dev checks; unversioned health is a common convention | **(c)** `GET /healthz` returning `200 {"status":"ok"}`, unversioned (health is not part of the versioned API surface), no auth, no cache | Thiago | Proposed | Trivial handler; enables Docker healthcheck if Docker is adopted |
| D20 | Local API / CORS strategy | (a) Vite dev proxy → same origin, no CORS; (b) explicit `Access-Control-Allow-Origin` from Go for localhost dev origin; (c) permissive `*` CORS | (a) sidesteps CORS entirely; (c) is loose for a submission; (b) is small but adds config | **(a)** primary: Vite dev proxy from `apps/web` to `http://localhost:8080`; `VITE_API_BASE_URL` may override with a same-origin base. **No CORS logic in the Go service** for the first release | Thiago | Proposed | Requires a small `vite.config.ts` proxy entry (post-adjudication) |
| D21 | Frontend interaction model | (a) operation-driven form (operation select + operand inputs + calculate button); (b) physical-calculator keypad; (c) hybrid | (b) is heavier UI, more state; (a) directly aligns with array-operand payload and is easily accessible via native form controls | **(a)** operation-driven form: operation `<select>`; one or two number inputs depending on arity; explicit "Calculate" submit; result region; error region | Thiago | Proposed | Constrains behavior tests, a11y, and unary/binary transition rules |
| D22 | Calculation-history scope | (a) none; (b) in-memory client-side list; (c) server-side persistence | (c) requires storage; (b) adds state and tests without a stated product need | **(a)** no history in first release; explicitly a non-goal | Thiago | Proposed | Removes storage / state-management churn |
| D23 | Request retry policy | (a) no automatic retries; (b) small retry on network error; (c) unlimited manual retries | Retries hide real failures on deterministic ops; existing frontend README already documents "no retries" | **(a)** no automatic retries. Manual retry via UI button after failure only | Thiago | Proposed | Aligns with existing `client.ts` policy |
| D24 | Cancellation and stale-response behavior | (a) `AbortController`; new submission cancels prior in-flight request; ignore stale responses; (b) accept last-arriving response; (c) queue serially | (b) causes flicker if responses arrive out of order; (a) is standard for interactive UIs | **(a)** use `AbortController` in the calculator hook; a new submission aborts the previous; aborted requests do not surface as errors | Thiago | Proposed | Frontend behavior test coverage |
| D25 | API-error localization strategy | (a) frontend maps stable `error.code` to i18n copy; (b) show server `error.message` verbatim; (c) hybrid: server message as fallback | (b) forces the server to know locales; (a) keeps the API locale-neutral | **(a)** frontend maps `code` → i18n key. Server `message` is diagnostic only, never displayed as the primary UI copy | Thiago | Proposed | Adds i18n keys per error code; server messages need not be user-friendly |
| D26 | Runtime response validation in TypeScript | (a) hand-written narrowing (`unknown` → validated `Response`); (b) add a schema library (zod, valibot); (c) trust `as Response` | (b) is a new dependency for one payload; (c) violates the no-`any`/narrow-`unknown` policy | **(a)** hand-written narrowing helpers in `apps/web/src/api/calculator.ts`; invalid shapes throw `ApiError('invalidResponse', …)` | Thiago | Proposed | No new dependency; small validator with tests |
| D27 | Coverage-threshold policy | (a) report only, no thresholds; (b) modest thresholds (e.g., 80% lines) enforced in CI; (c) high thresholds (95%+) | Thresholds without rationale reward vanity metrics; the product requires a report but not a specific number | **(a)** produce coverage reports on both sides (`go test -cover` and Vitest `--coverage`); enforce **no numeric threshold** in CI; require behavior-focused tests via review | Thiago | Proposed | CI adds coverage report artifacts, but no failing gate |
| D28 | Docker scope | (a) none; (b) optional `Dockerfile` + `docker-compose.yml` running Go + Vite dev server together, off critical path; (c) production-grade multi-stage image | Product says "Optional Dockerfile". (c) is disproportionate; (b) is achievable inside target-effort budget and useful for reviewers | **(b)** ship an **optional** compose file: Go service + built frontend served statically or via Vite preview. Not required for validation | Thiago | Proposed | Enables `docker compose up`; separate later task |
| D29 | Full-stack integration-test scope | (a) unit tests per side only; (b) one Go HTTP-level integration test in `httpapi` + one frontend test hitting a stubbed transport for the same scenario; (c) full E2E with browser automation | (c) adds Playwright/Cypress, out of scope; (a) misses cross-side contract drift; (b) covers a representative scenario cheaply | **(b)** one Go HTTP integration test (division-by-zero and one success) + one frontend integration test using mocked `fetch` at the API-boundary level, both driven by the contract examples | Thiago | Proposed | Small, cheap, catches contract drift; no browser automation |

**Single-credible-option items** (recorded directly in Stage 3, no
matrix row per the proportionality rule):

- HTTP method for `/v1/calculations` = `POST` (bodies over `GET` are
  not viable and calculation is a create-a-computation write).
- Request/response media type = `application/json` (frozen by
  product requirement and repository authority).
- API vocabulary language = English identifiers (repository policy;
  matches i18n base locale `en-US`).
- Response `Content-Type` header = `application/json; charset=utf-8`.
- No cross-language shared runtime package (frozen).
- No monetary-ledger claim (frozen by architecture).

### Stage 3 — Proposed calculator contract

> **Status:** Superseded pre-adjudication proposal. Retained as decision
> history. Where this section conflicts with **Stage 5 — Owner
> adjudication**, Stage 5 governs. The authoritative contract is
> [`docs/calculator-contract.md`](../calculator-contract.md).
>
> Non-exhaustive list of Stage 3 statements that are superseded by Stage 5
> and must not be relied on:
>
> - The set of operations (Stage 3 lists five; Stage 5 accepts seven,
>   including `power` and binary `percentage`).
> - The endpoint path (`/v1/calculations` → `/api/v1/calculations`).
> - The request-body limit (`1 MiB` → `16 KiB`).
> - The error vocabulary (Stage 5 adds `not_found` and splits numeric
>   failures into `math_domain` and `numeric_overflow`).
> - Frontend numeric formatting (`maximumFractionDigits: 12` → up to 15
>   significant digits with scientific notation for extreme magnitudes).
> - Frontend interaction model (operation-driven form → physical-calculator
>   state machine with equals-driven atomic submissions).
> - Docker topology (two-service dev compose → single multi-stage full-stack
>   image, optional and post-core).
> - Integration coverage (Stage 5 requires a real-server HTTP smoke test).
>
> Cross-reference every accepted decision through Stage 5 before using any
> value from this section.

#### §1 Purpose and authority

This proposed contract governs the calculator across the repository:
the Go arithmetic domain, the Go HTTP boundary, the frontend API
layer, the calculator feature's interaction behavior, the
localization boundary, the error taxonomy, and the test-ownership
matrix. Once accepted, it is the single source of truth referenced
by later tasks (Go domain, Go HTTP, frontend API integration,
frontend feature, integration tests). Until then, everything below
is **Proposed** and non-binding.

#### §2 Product scope

Proposed operations for the first release:

| Identifier | Display meaning | Arity | Formula | Positive example | Invalid-domain cases |
| --- | --- | --- | --- | --- | --- |
| `add` | Addition | 2 | `a + b` | `add(2, 3) = 5` | non-finite result → `numeric_overflow` |
| `subtract` | Subtraction | 2 | `a - b` | `subtract(10, 4) = 6` | non-finite result → `numeric_overflow` |
| `multiply` | Multiplication | 2 | `a * b` | `multiply(6, 7) = 42` | non-finite result → `numeric_overflow` |
| `divide` | Division | 2 | `a / b` where `b ≠ 0` | `divide(10, 4) = 2.5` | `b == 0` (incl. `-0`) → `division_by_zero`; non-finite result → `numeric_overflow` |
| `sqrt` | Square root | 1 | `√a` where `a ≥ 0` | `sqrt(9) = 3` | `a < 0` → `math_domain`; non-finite result → `numeric_overflow` |

Operand order is defined by array position: `operands[0]` is the
left operand, `operands[1]` is the right operand. For `sqrt`,
`operands[0]` is the sole operand.

Explicitly deferred: `power` (exponentiation), `percentage`, and any
history / chained-expression semantics. Deferrals are documented in
§18.

#### §3 Numeric model

- **Representation.** IEEE-754 double-precision `float64` on the
  backend; JSON numbers on the wire (RFC 8259 §6). Frontend TS uses
  `number`.
- **Accepted finite inputs.** Any JSON number that Go's
  `encoding/json` parses into a finite `float64`. Values outside the
  representable range are rejected during decoding.
- **Non-finite inputs.** JSON per RFC 8259 cannot encode `NaN`,
  `+Infinity`, or `-Infinity`; requests containing them (via
  non-standard extensions) are rejected as `invalid_json` (`400`).
- **Non-finite results.** If a valid finite operation produces
  `±Infinity` or `NaN` (overflow, `0/0`, etc.), the response is
  `numeric_overflow` (`422`). Domain code detects non-finite results
  before encoding.
- **Overflow.** Treated as a non-finite result → `numeric_overflow`.
- **Negative zero.** Accepted as input and treated as `0` by the
  domain (e.g., `divide(x, -0)` is `division_by_zero`). Normalized
  to positive `0` on output (`+0`) so `result` is never `-0` in JSON.
- **Rounding.** The backend performs no rounding; the raw `float64`
  result is serialized. Callers see native floating-point behavior.
- **Precision caveat.** Documented explicitly: `float64` cannot
  represent every decimal fraction exactly (`0.1 + 0.2 = 0.30000…`).
  This contract is **not suitable for monetary or ledger arithmetic**.
- **Scientific notation.** Go may emit scientific notation for very
  large/small magnitudes (e.g., `1e-20`, `1.7976931348623157e+308`).
  Clients must accept both fixed and exponent forms per RFC 8259.
- **Frontend formatting boundary.** The frontend formats numbers
  for display via `Intl.NumberFormat` using the active i18n locale
  (`en-US`, `pt-BR`). Formatting choices are **local to the
  frontend** and do not travel over the wire.
- **Monetary suitability.** Not suitable. Any monetary use would
  require a decimal representation and is a non-goal (§18).
- **Test comparison strategy.** Go table-driven tests compare with
  a small epsilon for floating-point results (e.g., `math.Abs(got -
  want) < 1e-9`) and exact equality for integer-valued results and
  normalization checks (`0` vs `-0`).

#### §4 REST API

- **Method.** `POST`.
- **Path.** `/v1/calculations` (versioned; additive future changes
  under `/v1/`, breaking changes under `/v2/`).
- **Request media type.** `application/json` (charset optional).
- **Response media type.** `application/json; charset=utf-8`.
- **Request body limit.** `1 MiB` (enforced via
  `http.MaxBytesReader`). Requests over this limit return
  `payload_too_large` (`413`).
- **Health endpoint.** `GET /healthz` → `200 {"status":"ok"}`,
  unversioned, no auth, `Cache-Control: no-store`.
- **Cache policy.** Calculations are cheap, deterministic, and
  submitted via `POST`. Responses set `Cache-Control: no-store`.
- **CORS / local dev.** Frontend dev server uses a Vite proxy that
  forwards `/v1/*` and `/healthz` to `http://localhost:8080`, so all
  requests are same-origin. The Go service ships without CORS
  headers by default; CORS may be added later when a deployment
  needs it.

Concrete examples:

```http
POST /v1/calculations HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Accept: application/json

{ "operation": "divide", "operands": [10, 4] }
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{ "operation": "divide", "operands": [10, 4], "result": 2.5 }
```

Unary example:

```http
POST /v1/calculations
{ "operation": "sqrt", "operands": [9] }

200 OK
{ "operation": "sqrt", "operands": [9], "result": 3 }
```

#### §5 Request validation

Observable behavior, in order of check:

| Situation | Behavior | Code | Status |
| --- | --- | --- | --- |
| `Content-Type` absent or not `application/json` | Reject before decoding | `unsupported_media_type` | `415` |
| Body exceeds `1 MiB` | Reject via `MaxBytesReader` | `payload_too_large` | `413` |
| Empty body | Reject | `invalid_request` | `400` |
| Malformed JSON (syntax error) | Reject | `invalid_json` | `400` |
| Trailing JSON after the first value | Reject (enforce single value via `Decoder.Decode` + subsequent `Decode` returning `io.EOF`) | `invalid_json` | `400` |
| Unknown fields | Reject via `DisallowUnknownFields()` | `invalid_request` | `400` |
| Missing `operation` or `operands` | Reject | `invalid_request` | `400` |
| `operation` present but not a known identifier | Reject | `unsupported_operation` | `422` |
| Wrong operand count for the operation (binary got 1 or 3+, unary got 0 or 2+) | Reject | `invalid_operands` | `422` |
| `null` where a number is expected (in operands array or operand fields) | Reject | `invalid_operands` | `422` |
| Numeric string (e.g., `"10"`) where a number is expected | Reject; no coercion | `invalid_operands` | `422` |
| Duplicate JSON object members | **Accept**: Go `encoding/json` uses last-wins semantics. Documented behavior; covered by a test | (no error) | `200` |

Notes:

- The 400/422 boundary: `400` is used for requests that cannot be
  interpreted as a valid calculation payload (transport-shape
  errors); `422` is used for requests whose JSON is well-formed and
  structurally correct but whose semantic content is not a
  processable calculation.
- All rejection responses follow the error envelope in §7.

#### §6 Success response

- **Fields.** Exactly `operation` (string), `operands` (array of
  numbers), `result` (number). No other top-level keys.
- **Operands echo.** The server echoes the normalized operands (e.g.,
  `-0` → `0`); no rounding is applied.
- **Machine value vs display string.** `result` is the raw JSON
  number. Display strings are the frontend's responsibility (§14).
- **Negative-zero normalization.** `result` is never encoded as
  `-0`; the server normalizes `-0.0 → 0.0` before writing.
- **Metadata.** None: no timestamp, no request id, no version, no
  computed expression string. Additive additions require a future
  contract change under the same major version.

#### §7 Error contract

Envelope:

```json
{ "error": { "code": "division_by_zero", "message": "Cannot divide by zero." } }
```

- `code`: **stable, machine-readable** identifier from the fixed set
  in Stage 2 D16.
- `message`: **diagnostic**, English, subject to change; never
  localized by the server; not the primary UI copy.
- No `details` field in the first release; may be added additively
  if a future need arises.
- Internal errors are never leaked; `internal_error` uses a generic
  message such as `"An unexpected error occurred."`.

Error table:

| Error code | Situation | HTTP status |
| --- | --- | --- |
| `invalid_json` | Malformed JSON, non-finite JSON literal, trailing values | `400` |
| `invalid_request` | Empty body, missing/extraneous fields, wrong types where structural | `400` |
| `unsupported_operation` | Unknown `operation` value | `422` |
| `invalid_operands` | Wrong count, wrong type (`null`, string, array), non-finite input | `422` |
| `division_by_zero` | `divide` with second operand `0` or `-0` | `422` |
| `math_domain` | `sqrt` of a negative number | `422` |
| `numeric_overflow` | Result is `±Infinity` or `NaN` | `422` |
| `payload_too_large` | Body exceeds `1 MiB` | `413` |
| `unsupported_media_type` | `Content-Type` not `application/json` | `415` |
| `method_not_allowed` | Any non-`POST` on `/v1/calculations` (or non-`GET` on `/healthz`) | `405` |
| `internal_error` | Uncaught panic or unexpected server fault | `500` |

The `message` for each code is API-stable in wording tone only, not
character-for-character. The frontend must not rely on message text.

#### §8 HTTP behavior

- **`200`** for successful calculations only.
- **`400`** for `invalid_json`, `invalid_request`.
- **`405`** for wrong method; `Allow: POST` on the calculations
  endpoint, `Allow: GET` on `/healthz`. Body is the standard error
  envelope with code `method_not_allowed`.
- **`413`** for `payload_too_large`; envelope with that code.
- **`415`** for `unsupported_media_type`; envelope with that code.
- **`422`** for `unsupported_operation`, `invalid_operands`,
  `division_by_zero`, `math_domain`, `numeric_overflow`.
- **`500`** for `internal_error` (recovered panics or unexpected
  faults), always with the generic message.
- Every response, including errors, sets
  `Content-Type: application/json; charset=utf-8` and
  `Cache-Control: no-store`.
- `/healthz` returns `200 {"status":"ok"}` with `no-store`.

#### §9 Go domain boundary (`apps/api/internal/calculator`)

Conceptual (non-final) shape:

```go
// Illustrative — not implementation. Marked non-final.
package calculator

type Operation string

const (
    OpAdd      Operation = "add"
    OpSubtract Operation = "subtract"
    OpMultiply Operation = "multiply"
    OpDivide   Operation = "divide"
    OpSqrt     Operation = "sqrt"
)

var (
    ErrUnsupportedOperation = errors.New("unsupported operation")
    ErrInvalidOperands      = errors.New("invalid operands")
    ErrDivisionByZero       = errors.New("division by zero")
    ErrMathDomain           = errors.New("math domain error")
    ErrNumericOverflow      = errors.New("numeric overflow")
)

// Calculate is a pure function. It knows nothing about HTTP or JSON.
func Calculate(op Operation, operands []float64) (float64, error)
```

Ownership:

- **Operations**: enumerated `Operation` string constants.
- **Operands / result**: `[]float64` in, `float64` out. Negative-zero
  normalization is applied to the returned result.
- **Typed domain failures**: sentinel errors above (`errors.Is`-able).
- **Arity validation**: enforced by the domain.
- **Finite-value validation**: enforced by the domain (input NaNs
  reach the domain only if the HTTP layer misbehaves; the domain
  returns `ErrInvalidOperands` for non-finite operands).
- **Operation-specific rules**: division-by-zero, sqrt-negative,
  overflow-produces-non-finite — all handled here.

The domain must not import `net/http`, JSON packages beyond internal
number handling if any, status codes, i18n, or frontend types.

#### §10 Go HTTP boundary (`apps/api/internal/httpapi`)

Responsibilities:

- **Strict decoding**: `json.NewDecoder(io.LimitReader(...))` with
  `DisallowUnknownFields`; enforce a single top-level value by
  calling `Decode` once and requiring the next call to return
  `io.EOF`.
- **Request DTOs**: internal Go types mirror the wire schema;
  translated into domain inputs.
- **Body limiting**: `http.MaxBytesReader(w, r.Body, 1<<20)`;
  oversize returns `413 payload_too_large`.
- **Content-type gate**: reject non-JSON before reading the body.
- **Domain translation**: DTO → `(Operation, []float64)` →
  `calculator.Calculate`; sentinel errors mapped to `(code, status)`
  pairs.
- **Status/error mapping**: single source-of-truth table matching §7.
- **Response encoding**: `json.NewEncoder(w)` with negative-zero
  normalization; sets response headers.
- **Routing**: `POST /v1/calculations`, `GET /healthz`; any other
  method on those paths returns `405` with `Allow`.
- **Health handling**: separate handler; no dependency on the domain.

Server bootstrap (timeouts, graceful shutdown, panic recovery
middleware, logging format) is intentionally deferred to a later
Go server task per §12 of the task spec.

#### §11 Frontend API boundary (`apps/web/src/api/`)

Conceptual TypeScript types (illustrative, non-final):

```ts
// apps/web/src/api/calculator.ts (planned; do not create in this task)
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'sqrt';

export type CalculationRequest = {
  operation: Operation;
  operands: readonly number[]; // length 1 (sqrt) or 2 (all others)
};

export type CalculationResponse = {
  operation: Operation;
  operands: readonly number[];
  result: number;
};

export type ApiErrorCode =
  | 'invalid_json'
  | 'invalid_request'
  | 'unsupported_operation'
  | 'invalid_operands'
  | 'division_by_zero'
  | 'math_domain'
  | 'numeric_overflow'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'method_not_allowed'
  | 'internal_error';
```

Error categories the caller must distinguish (built on top of the
existing `ApiError`):

- **Structured API failure** — `kind: 'apiError'` with a decoded
  `code: ApiErrorCode` and `message: string` narrowed from the
  response body.
- **Network failure** — `kind: 'network'` (offline, DNS, refused
  connection).
- **Cancellation** — `kind: 'aborted'` (user submitted a new
  calculation or unmounted). Never surfaces as an error to the
  user.
- **Invalid server response** — `kind: 'invalidResponse'` when the
  response body does not match `CalculationResponse` or the error
  envelope. Considered a bug; may be logged for review.

Response narrowing is a hand-written type guard; no schema library
is introduced.

#### §12 Interaction behavior

- **Operation selection.** Via a labeled `<select>` (or an
  equivalent accessible custom control) driven by the same
  `Operation` union used at the API boundary.
- **Unary / binary inputs.** Selecting `sqrt` hides the second
  operand input and removes it from the request. Switching between
  arities preserves compatible values (the first operand is kept).
- **Submission.** Explicit "Calculate" button; also submitted on
  `Enter` within any operand input.
- **Keyboard use.** All controls are focusable, in a natural DOM
  order; submit works via keyboard alone.
- **Loading.** The submit button is disabled and marked with an
  accessible busy state while a request is in flight.
- **Previous result behavior.** A prior successful result remains
  visible while a new calculation loads; it is replaced only when
  the new one succeeds. On failure, the prior result stays visible
  and the error is shown separately.
- **Errors.** The frontend translates `ApiErrorCode` to localized
  copy via i18n keys (see §14). Field-level errors (`invalid_operands`)
  are attached to the operand region; request-level errors are
  attached to a live status region.
- **Retry.** Explicit retry button after a network or `internal_error`
  failure. No automatic retry.
- **Reset / clear.** A visible clear button resets operands, error
  state, and last result.
- **Copy action.** A "copy result" button copies the formatted
  result to the clipboard (feature-gated: added only if it fits
  target effort; otherwise deferred).
- **History.** Out of scope (§18).

#### §13 Accessibility

Testable acceptance criteria:

- Each operand input has a programmatic `<label>` (or
  `aria-labelledby`) tying it to its visible name.
- Operation `<select>` has a visible label.
- Field errors are announced via `aria-describedby` on the affected
  input and are perceivable without color alone (icon + text).
- Request-level errors and results are announced through an
  `aria-live="polite"` status region without moving focus.
- All actions (operation change, operand entry, submit, retry,
  clear, copy) are reachable and operable by keyboard only.
- Focus remains predictable after submission — it does not jump to
  the result; the status region announces the result.
- Loading state is programmatically available (`aria-busy` or
  `role="status"`) and communicated to assistive tech.
- Unary/binary transitions do not leave orphaned inputs focused;
  the hidden operand input is removed from the tab order and DOM.
- If any animation is added later, `prefers-reduced-motion` is
  respected.
- Mobile touch targets are ≥ 44×44 CSS px.

#### §14 Localization

- **Stable, untranslated identifiers.** Operation IDs
  (`add`, `subtract`, `multiply`, `divide`, `sqrt`), JSON field
  names, and error codes are English-only; they never travel
  through i18n.
- **Frontend localization ownership.** Operation labels ("Add",
  "Adicionar", …), button labels, error messages shown to the
  user, and number formatting live in `apps/web/src/i18n/locales/`
  and `Intl.NumberFormat`.
- **API-message handling.** The server-provided `error.message` is
  never rendered as the primary user-facing text; it may appear in
  a diagnostic developer panel or a copy-log entry.
- **Number display.** `Intl.NumberFormat` with the active locale
  and `maximumFractionDigits ≈ 12`; scientific notation is
  permitted when the raw value already requires it.
- **Supported repository locales.** `en-US` (base), `pt-BR`,
  `pseudo` (unchanged from the frontend foundation).

#### §15 Test ownership

| Behavior | Go domain | Go HTTP | Frontend API | Frontend UI | Full stack |
| --- | --- | --- | --- | --- | --- |
| Formulas & arity for each accepted operation | ● |   |   |   |   |
| Division-by-zero and math-domain errors | ● | ● |   |   | ● |
| Numeric overflow / non-finite results | ● | ● |   |   |   |
| Negative-zero normalization | ● | ● |   |   |   |
| Strict JSON decoding (unknown fields, trailing values, empty body, syntax errors) |   | ● |   |   |   |
| Content-type handling (415) |   | ● |   |   |   |
| Method not allowed (405 + `Allow`) |   | ● |   |   |   |
| Body-size limit (413) |   | ● |   |   |   |
| Duplicate JSON member accepted (last-wins) |   | ● |   |   |   |
| Success response shape and headers |   | ● |   |   | ● |
| Health endpoint |   | ● |   |   |   |
| Request serialization / URL / method | | | ● | | |
| Response parsing and narrowing (invalid response path) | | | ● | | |
| Structured API-error decoding | | | ● | | |
| Cancellation (`aborted`) | | | ● | ● | |
| Network failure surfacing | | | ● | ● | |
| Operation-switching UI (unary/binary) |   |   |   | ● |   |
| Input validation / loading / disabled submit |   |   |   | ● |   |
| Error → localized copy mapping |   |   |   | ● |   |
| Keyboard operation and focus behavior |   |   |   | ● |   |
| A11y status region announcement |   |   |   | ● |   |
| One successful required op + division-by-zero end-to-end |   |   |   |   | ● |

Every accepted/proposed behavior has at least one owning layer.

#### §16 Quality and coverage

- **Coverage reporting.** Go via `go test -cover` producing a
  profile; frontend via Vitest `--coverage` (v8 provider).
- **Thresholds.** None enforced by CI in this release. Coverage is
  read as a code-review signal; behavior tests take priority over
  numeric targets.
- **CI gates.** Formatting (gofmt, prettier), linting (`go vet`,
  eslint, stylelint), typechecking, i18n parity, and all tests
  must pass. Building must succeed on both sides.
- **Contract-example verification.** The success and error
  examples in §4 and §7 are also used as test fixtures in the Go
  HTTP tests and the frontend API tests. A drift in either side
  fails at least one test.

#### §17 Security and robustness

Proportional controls only:

- Strict decoding (`DisallowUnknownFields`, single JSON value).
- `1 MiB` request-body limit (`http.MaxBytesReader`).
- Enforced JSON content type.
- Server timeouts as a principle (`ReadHeaderTimeout`,
  `ReadTimeout`, `WriteTimeout`, `IdleTimeout`); exact values
  deferred to the Go server task.
- Graceful shutdown as a principle; exact duration deferred.
- Panic recovery middleware maps panics to `internal_error`
  (`500`) with the generic message; details never leak to the
  client and are logged server-side.
- CORS not configured; same-origin via dev proxy.
- Computation bounds not required for the accepted operation set
  (no exponentiation).

Explicitly out of proportion for this release: authentication,
authorization, rate limiting, distributed tracing, request IDs.

#### §18 Non-goals

- **Excluded from this release.** `power`, `percentage`, history,
  chained expressions, copy-result button (if target effort
  doesn't fit), coverage thresholds, request/correlation IDs,
  observability stack, structured logging format, browser E2E
  tests.
- **Prohibited by repository architecture.** Runtime fake backend,
  cross-language shared runtime package, client-side arithmetic
  for API-owned operations, monetary-ledger claims, heavyweight
  monorepo tooling, database, authentication, GraphQL, queues,
  service discovery, Kubernetes, plugin systems.
- **Deferred until a concrete need arises.** Server-side CORS,
  arbitrary-precision arithmetic, decimal representation, OpenAPI /
  JSON Schema, generated clients, request IDs, distributed tracing,
  Docker production image.

#### §19 Implementation implications

Likely next tasks (not authored here):

1. **Go arithmetic domain** — implement the `calculator` package
   per §9 with table-driven tests covering §15's domain row.
2. **Go HTTP boundary** — implement `internal/httpapi` per §10 with
   handler tests covering §15's HTTP row.
3. **Go server bootstrap** — `cmd/server/main.go`: composition,
   timeouts, graceful shutdown, panic recovery; open port `8080`.
4. **Frontend calculator API integration** — `apps/web/src/api/
   calculator.ts` with request/response types, error narrowing,
   `ApiError` enrichment.
5. **Frontend calculator feature** — `apps/web/src/features/
   calculator/` with the interaction model from §12, i18n copy,
   and a11y from §13.
6. **Integration test** — one Go HTTP test and one frontend
   mocked-transport test driven by the same contract fixtures.
7. **Optional Docker task** — `Dockerfile` + `docker-compose.yml`
   for `docker compose up` of the full stack.
8. **README / architecture updates** — add API examples, run
   instructions, and design decisions summary.

### Stage 4 — Owner-review summary

> **Status:** Historical review brief. All items listed here have been
> adjudicated by Thiago in **Stage 5**. Where the recommendation summarized
> below differs from the accepted decision (notably D01 operation scope,
> D02 percentage, D08/D09 endpoint path, body limit, error taxonomy, and
> frontend formatting/interaction), the Stage 5 adjudication governs.

Compact decision brief for Thiago. Each item is written to be
adjudicated without reading Stage 3 end-to-end. Cross-references
point back to Stage 2 row IDs.

#### Product semantics

**D01 — Optional-operation scope**
- Decision: Ship required 4 + `sqrt`; defer `power` and `percentage`.
- Recommendation: Accept.
- Main alternative: Ship required 4 only (smallest surface); or ship
  all three optionals.
- Why this matters: Fixes the operation union across Go, TS, and UI;
  drives whether the unary-input path exists in the first release.
- Your options: Accept · Accept with modification · Reject · Defer.

**D02 — Percentage semantics**
- Decision: Omit percentage from the first release.
- Recommendation: Accept.
- Main alternative: Ship as unary `x/100` or binary `a*b/100`.
- Why this matters: Percentage has three defensible meanings; picking
  the wrong one is a UX bug that survives release.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Numeric behavior

**D03 — Numeric representation**
- Decision: `float64` on backend, JSON numbers on wire; not monetary.
- Recommendation: Accept.
- Main alternative: Decimal library or string-encoded decimals.
- Why this matters: Determines every numeric edge case downstream and
  what the contract can honestly promise.
- Your options: Accept · Accept with modification · Reject · Defer.

**D04 — Finite-value policy**
- Decision: Reject non-finite inputs (via RFC 8259) and non-finite
  results via `numeric_overflow` (`422`).
- Recommendation: Accept.
- Main alternative: Allow `±Infinity/NaN` via string extensions.
- Why this matters: Prevents `NaN`/`Infinity` from ever reaching the
  UI without a controlled error path.
- Your options: Accept · Accept with modification · Reject · Defer.

**D05 — Negative-zero policy**
- Decision: Accept `-0` in; normalize to `+0` in responses.
- Recommendation: Accept.
- Main alternative: Preserve `-0` on output.
- Why this matters: Determines a small but user-visible normalization
  rule and a test.
- Your options: Accept · Accept with modification · Reject · Defer.

**D06 — Backend rounding**
- Decision: No rounding; return the raw `float64`.
- Recommendation: Accept.
- Main alternative: Round server-side to N decimals.
- Why this matters: Splits precision honesty (backend) from display
  polish (frontend, D07).
- Your options: Accept · Accept with modification · Reject · Defer.

**D07 — Frontend number-formatting**
- Decision: `Intl.NumberFormat` per active locale with reasonable
  `maximumFractionDigits`.
- Recommendation: Accept.
- Main alternative: Fixed 2 decimals; raw `toString`.
- Why this matters: Determines how numbers look in `en-US` vs `pt-BR`.
- Your options: Accept · Accept with modification · Reject · Defer.

#### REST API

**D08 / D09 — Endpoint structure, path, versioning**
- Decision: Single `POST /v1/calculations` resource.
- Recommendation: Accept.
- Main alternative: One endpoint per operation; unversioned path.
- Why this matters: Adding operations is additive; frontend has one
  function to call.
- Your options: Accept · Accept with modification · Reject · Defer.

**D10 — Request schema**
- Decision: `{ "operation": …, "operands": [a, b?] }` array-of-operands.
- Recommendation: Accept.
- Main alternative: Explicit `{ left, right }` fields.
- Why this matters: Uniform across unary and binary; extensible.
- Your options: Accept · Accept with modification · Reject · Defer.

**D11 — Success response**
- Decision: `{ operation, operands, result }` — no metadata.
- Recommendation: Accept.
- Main alternative: `{ result }` only, or add timestamp/id.
- Why this matters: Late-arriving-response detection and testing
  become easier without cost.
- Your options: Accept · Accept with modification · Reject · Defer.

**D12 — Strict unknown-field handling**
- Decision: Enable `DisallowUnknownFields()`.
- Recommendation: Accept.
- Main alternative: Tolerate unknown fields.
- Why this matters: Catches client typos loudly and early.
- Your options: Accept · Accept with modification · Reject · Defer.

**D13 — Duplicate JSON members**
- Decision: Accept stdlib default (last-wins); document it.
- Recommendation: Accept.
- Main alternative: Custom parser to reject duplicates.
- Why this matters: A custom parser is disproportionate for a
  documented, well-known behavior.
- Your options: Accept · Accept with modification · Reject · Defer.

**D14 — Content-type policy**
- Decision: Require `application/json`; reject others with `415`.
- Recommendation: Accept.
- Main alternative: Sniff body.
- Why this matters: Standard, cheap, aligns with `Accept` header.
- Your options: Accept · Accept with modification · Reject · Defer.

**D19 — Health endpoint**
- Decision: `GET /healthz` → `200 {"status":"ok"}`, unversioned.
- Recommendation: Accept.
- Main alternative: No health endpoint; or versioned health.
- Why this matters: Enables Docker healthcheck later.
- Your options: Accept · Accept with modification · Reject · Defer.

**D20 — Local API / CORS**
- Decision: Vite dev proxy; no CORS in the Go service for the first
  release.
- Recommendation: Accept.
- Main alternative: Explicit CORS in Go for `http://localhost:5173`.
- Why this matters: Avoids CORS logic that would only be exercised in
  development.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Errors and statuses

**D15 — Error envelope**
- Decision: Project-owned `{ "error": { "code", "message" } }`.
- Recommendation: Accept.
- Main alternative: RFC 7807 problem details.
- Why this matters: 7807's fields add noise for a small calculator;
  the envelope aligns with existing `ApiError`.
- Your options: Accept · Accept with modification · Reject · Defer.

**D16 — Error-code vocabulary**
- Decision: Fixed set of 11 stable codes (see D16 row).
- Recommendation: Accept.
- Main alternative: Rely on HTTP status only; or one code per parser
  detail.
- Why this matters: Anchors i18n mapping and error tests on both
  sides.
- Your options: Accept · Accept with modification · Reject · Defer.

**D17 — HTTP status mapping**
- Decision: Adopt matrix in D17 row (400 for transport-shape errors,
  422 for domain, 413/415/405/500 for their standard cases).
- Recommendation: Accept.
- Main alternative: Use `400` for everything below `500`.
- Why this matters: Makes error handling test-driven and consistent.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Go architecture

**D18 — Go domain API shape**
- Decision: Pure `Calculate(op, operands) (float64, error)` with
  sentinel errors.
- Recommendation: Accept.
- Main alternative: Operation registry, calculator struct, or
  interface-based service.
- Why this matters: Speculative abstractions are hard to remove
  later; a pure function is easy to grow.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Frontend behavior

**D21 — Interaction model**
- Decision: Operation-driven form (select + operands + calculate).
- Recommendation: Accept.
- Main alternative: Physical-calculator keypad; hybrid.
- Why this matters: Determines the a11y strategy and test surface.
- Your options: Accept · Accept with modification · Reject · Defer.

**D22 — History scope**
- Decision: No history in the first release.
- Recommendation: Accept.
- Main alternative: In-memory client history list.
- Why this matters: History adds state, tests, and UI copy; not in
  the product requirements.
- Your options: Accept · Accept with modification · Reject · Defer.

**D23 — Retry policy**
- Decision: No automatic retries; manual retry button after failure.
- Recommendation: Accept.
- Main alternative: Retry on network errors.
- Why this matters: Calculations are deterministic; retries hide real
  failures.
- Your options: Accept · Accept with modification · Reject · Defer.

**D24 — Cancellation and stale responses**
- Decision: `AbortController`; new submission cancels prior;
  abort ≠ error.
- Recommendation: Accept.
- Main alternative: Accept last-arriving response; serial queue.
- Why this matters: Prevents flicker and stale results on quick
  successive submissions.
- Your options: Accept · Accept with modification · Reject · Defer.

**D25 — API-error localization**
- Decision: Frontend maps stable `error.code` to i18n copy; server
  message is diagnostic only.
- Recommendation: Accept.
- Main alternative: Server-supplied localized messages.
- Why this matters: Keeps API locale-neutral and matches the frontend
  i18n architecture.
- Your options: Accept · Accept with modification · Reject · Defer.

**D26 — Runtime response validation**
- Decision: Hand-written narrowing helpers; no schema library.
- Recommendation: Accept.
- Main alternative: Add zod/valibot.
- Why this matters: Avoids a dependency for one payload.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Testing and delivery

**D27 — Coverage-threshold policy**
- Decision: Report coverage on both sides; no numeric threshold in CI.
- Recommendation: Accept.
- Main alternative: Enforce a threshold (e.g., 80%).
- Why this matters: Avoids optimizing for vanity metrics while still
  producing a report per product requirement.
- Your options: Accept · Accept with modification · Reject · Defer.

**D28 — Docker scope**
- Decision: Optional Docker compose (Go + built frontend) as a
  separate later task; not required for validation.
- Recommendation: Accept.
- Main alternative: No Docker; production-grade multi-stage image.
- Why this matters: Product marks Docker optional; the review
  experience benefits from `docker compose up`.
- Your options: Accept · Accept with modification · Reject · Defer.

**D29 — Full-stack integration-test scope**
- Decision: One Go HTTP integration test + one frontend
  mocked-transport integration test, both driven by contract
  fixtures.
- Recommendation: Accept.
- Main alternative: Full E2E with browser automation.
- Why this matters: Catches contract drift cheaply; no Playwright /
  Cypress dependency.
- Your options: Accept · Accept with modification · Reject · Defer.

#### Recommended package

Ship a coherent minimal system:

- Five operations (`add`, `subtract`, `multiply`, `divide`, `sqrt`).
- One versioned endpoint (`POST /v1/calculations`) plus an
  unversioned `GET /healthz`.
- IEEE-754 `float64` semantics, honest about precision, not
  monetary. Negative-zero normalized out.
- Strict decoding, `1 MiB` body limit, `application/json` gate,
  duplicate-member behavior documented as stdlib default.
- Small stable error vocabulary of 11 codes; project-owned envelope;
  clean 400/422 boundary.
- Pure Go domain with sentinel errors; thin HTTP adapter.
- Frontend: operation-driven form; hand-written narrowing on top of
  the existing `ApiError`; `AbortController`-driven cancellation;
  no retries; `Intl.NumberFormat` display; localized copy driven by
  stable error codes.
- Coverage reported but not thresholded; one HTTP integration test
  and one mocked-transport integration test as the contract-drift
  safety net.
- Docker compose optional, deferred to a separate task.

Accepting any conflicting individual choice may require adjustments
elsewhere — for example, accepting percentage (D02) resurrects the
semantics decision and adds error-code and i18n work; accepting
strict duplicate-key rejection (D13) requires a custom parser and a
new test class.

#### Questions requiring Thiago

Genuine owner decisions only:

1. Optional-operation scope (D01) — ship `sqrt` only, or also
   `power` and/or `percentage`?
2. Percentage semantics (D02) — omit, unary `x/100`, or binary
   `a*b/100`?
3. Endpoint versioning stance (D09) — accept `/v1/` prefix from day
   one?
4. Duplicate JSON-member behavior (D13) — accept stdlib default and
   document, or invest in a custom parser?
5. Error envelope shape (D15) — project-owned envelope or RFC 7807?
6. HTTP status boundary (D17) — accept the 400 vs 422 split as
   proposed?
7. History (D22) — confirm out of scope?
8. Retry policy (D23) — confirm no automatic retries?
9. API-error localization (D25) — confirm code-driven, not
   server-message-driven?
10. Coverage-threshold policy (D27) — report only, no gate?
11. Docker scope (D28) — optional compose in a later task, or none?

All other rows in Stage 2 are consequential but flow naturally from
these anchors; they are still Proposed and available for direct
adjudication.

### Stage 5 — Owner adjudication
> **Owner:** Thiago
> **Outcome:** All consequential decisions adjudicated.
> **Instruction for Stage 6:** The Stage 2 recommendations and Stage 3
> proposed contract are superseded wherever they conflict with the accepted
> decisions below. Reconcile the full document before creating
> `docs/calculator-contract.md`.

#### Product semantics

##### D01 — Optional-operation scope

**Decision:** Accepted with modification.

Ship all required and optional operations in the first release:

- `add`;
- `subtract`;
- `multiply`;
- `divide`;
- `power`;
- `sqrt`;
- `percentage`.

The optional operations remain in scope because they add meaningful capability
without requiring additional infrastructure or speculative architecture.
Their mathematical domains and edge cases must be documented and tested.
Correctness, product polish, and required behavior remain higher priority than
ancillary features.

##### D02 — Percentage semantics

**Decision:** Accepted with modification.

Define `percentage` as a binary “percentage of” operation:

`percentage(base, rate) = base * rate / 100`

The first operand is the base value and the second is the percentage rate. For
example, `percentage(200, 15) = 30`.

Negative rates, rates above 100, and zero values are valid when the result
remains finite. Contextual physical-calculator percentage behavior is
explicitly unsupported because it depends on prior expression state and does
not provide a stable standalone API operation.

#### Numeric behavior

##### D03 — Numeric representation

**Decision:** Accepted.

Use Go `float64`, JavaScript `number`, and JSON numbers throughout the
calculator contract. The calculator targets general mathematical use and
follows normal IEEE-754 floating-point behavior. It does not provide decimal
ledger, currency, accounting, or settlement guarantees.

##### D04 — Finite-value policy

**Decision:** Accepted with modification.

Operands must be finite JSON numbers. Literal `NaN`, `Infinity`, and
`-Infinity` are invalid JSON and map to `invalid_json`. String representations
of non-finite values are invalid request representations.

Every successful result must be finite before it is returned. Infinite results
caused by numeric range overflow map to `numeric_overflow`. NaN results caused
by an operation outside the supported real-number domain map to `math_domain`.

##### D05 — Negative-zero policy

**Decision:** Accepted with modification.

Negative zero is accepted as numerically equivalent to zero. Both `0` and
`-0` are invalid divisors and map to `division_by_zero`.

All successful zero-valued results and all operands echoed in successful
responses are normalized to positive zero.

##### D06 — Backend rounding policy

**Decision:** Accepted with modification.

The backend performs no presentation-oriented decimal rounding. It returns the
finite `float64` value produced by the operation after domain validation and
zero normalization. The contract must not describe this value as an exact
real-number result.

##### D07 — Frontend number formatting

**Decision:** Accepted with modification.

The frontend formats results using the active locale and `Intl.NumberFormat`,
with a target maximum of 15 significant digits. Unnecessary trailing zeros are
omitted. Scientific notation is used for extreme magnitudes when ordinary
notation would be misleading or unwieldy.

Formatting is presentation-only and does not alter the numeric API value.
Representative behavior must be covered by frontend tests.

#### REST API and request handling

##### D08 — Endpoint structure

**Decision:** Accepted.

Expose one calculation resource endpoint rather than one endpoint per
operation. All operations use the same request, validation, response, and error
pipeline.

##### D09 — Endpoint path and versioning

**Decision:** Accepted with modification.

Use `POST /api/v1/calculations`. The `/api` prefix separates API traffic from
frontend routes and assets and supports a simple development proxy. The `v1`
prefix owns the first stable request and response contract.

##### D10 — Request schema

**Decision:** Accepted.

Use:

`{ "operation": "<identifier>", "operands": [<number>, ...] }`

The operation identifier is required and case-sensitive. `operands` is a
required array of finite JSON numbers. `sqrt` requires exactly one operand; all
other accepted operations require exactly two. Missing, extra, null, string,
or otherwise non-numeric operands are rejected.

##### D11 — Success-response schema

**Decision:** Accepted.

Return:

`{ "operation": "<identifier>", "operands": [...], "result": <number> }`

The response echoes the canonical operation and normalized operands. It does
not contain formatted strings, expressions, timestamps, request identifiers,
or additional metadata.

##### D12 — Unknown request fields

**Decision:** Accepted.

Reject unknown top-level request fields using strict Go JSON decoding. Return
`400 invalid_request`. Client behavior depends on the stable error code rather
than parsing the diagnostic message.

##### D13 — Duplicate JSON members

**Decision:** Accepted.

Duplicate member names are noncanonical input. The service does not add a
custom duplicate-key parser and follows Go's standard decoding behavior, in
which later values take precedence for the request DTO. This behavior is
documented and covered by an HTTP-layer test.

##### D14 — Request content type

**Decision:** Accepted with clarification.

Require `Content-Type: application/json`, allowing valid media-type parameters
such as `charset=utf-8`. Missing, malformed, or unsupported content types
return `415 unsupported_media_type`. An empty JSON request body returns
`400 invalid_request`; malformed JSON returns `400 invalid_json`.

##### Request-body limit

**Decision:** Accepted with modification.

Limit calculation request bodies to 16 KiB. Larger bodies return
`413 payload_too_large`.

#### Error model and HTTP statuses

##### D15 — Error-envelope model

**Decision:** Accepted.

Use a project-owned error envelope:

`{ "error": { "code": "<stable_code>", "message": "<diagnostic_message>" } }`

The first release does not include structured details, timestamps, request
identifiers, stack traces, or duplicated HTTP status fields. Structured
validation details are deferred until a concrete client need exists.

##### D16 — Error-code vocabulary

**Decision:** Accepted with modification.

Use these stable lowercase snake-case codes:

- `invalid_json`;
- `invalid_request`;
- `unsupported_operation`;
- `invalid_operands`;
- `division_by_zero`;
- `math_domain`;
- `numeric_overflow`;
- `payload_too_large`;
- `unsupported_media_type`;
- `method_not_allowed`;
- `not_found`;
- `internal_error`.

`invalid_request` covers valid JSON that does not match the request
representation. `invalid_operands` covers recognizable calculation requests
whose operand count or general operand semantics are invalid.
Operation-specific failures use `division_by_zero`, `math_domain`, or
`numeric_overflow`.

##### D17 — HTTP status policy

**Decision:** Accepted with modification.

Use:

- `400` for malformed JSON and invalid request representation;
- `404` for unmatched API resources;
- `405` for unsupported methods, with the appropriate `Allow` header;
- `413` for request bodies larger than 16 KiB;
- `415` for missing, malformed, or unsupported request media types;
- `422` for recognizable calculation requests that fail operation or domain
  semantics;
- `500` for unexpected server faults.

All API responses use JSON and
`Content-Type: application/json; charset=utf-8`. Calculation responses include
`Cache-Control: no-store`. Internal implementation details never appear in
client responses.

#### Go architecture and local integration

##### D18 — Go domain API shape

**Decision:** Accepted with modification.

Use a small stateless `calculator` package with:

`Calculate(operation Operation, operands []float64) (float64, error)`

`Operation` is a defined string type with constants for `add`, `subtract`,
`multiply`, `divide`, `power`, `sqrt`, and `percentage`.

The package uses classifiable sentinel errors for unsupported operations,
invalid operands, division by zero, mathematical-domain failures, and numeric
overflow. Errors may be wrapped with diagnostic context and remain compatible
with `errors.Is`.

The package owns arity validation, finite-result validation,
operation-specific mathematical rules, and zero normalization. It does not
know about HTTP, JSON, localized messages, status codes, or frontend types. No
service struct, interface, registry, or dependency-injection abstraction is
introduced.

##### Power semantics

**Decision:** Accepted.

- `power(0, 0) = 1`;
- negative bases with integer exponents are valid;
- negative bases with non-integer exponents return `math_domain`;
- negative exponents are valid when the result is finite;
- zero raised to a negative exponent returns `math_domain`;
- non-finite results caused by numeric range return `numeric_overflow`;
- complex-number results are unsupported.

##### D19 — Health endpoint

**Decision:** Accepted.

Expose `GET /healthz`, returning `{ "status": "ok" }` with `200`, JSON content
type, and `Cache-Control: no-store`. The endpoint indicates only that the
process and HTTP server are available; the service has no external
dependencies to probe. Unsupported methods return `405 method_not_allowed`
with `Allow: GET`. Separate liveness and readiness endpoints are unnecessary.

##### D20 — Local API and CORS strategy

**Decision:** Accepted with modification.

The frontend calls same-origin `/api/v1/calculations` by default. During local
development, Vite proxies `/api` to the Go service on port `8080`. The Go
service does not implement CORS for the first release.

`VITE_API_BASE_URL` may override the frontend API base for deployment or
testing. Cross-origin deployments own the necessary reverse-proxy or CORS
configuration outside the first-release application contract.

The backend reads `PORT`, defaulting to `8080`.

#### Frontend behavior and API integration

##### D21 — Frontend interaction model

**Decision:** Accepted with modification.

Use a physical-calculator-style interface with:

- a numeric display;
- digit buttons `0–9`;
- a locale-aware decimal-separator key;
- operation buttons for addition, subtraction, multiplication, division,
  power, square root, and percentage;
- a sign-toggle control;
- clear and backspace controls;
- an equals button;
- full keyboard support.

The frontend manages input composition and calculator interaction state but
does not become an arithmetic authority. Pressing equals submits one atomic
operation to `POST /api/v1/calculations`; the displayed result comes from the
backend response.

The first release does not support free-form expressions, parentheses,
operator precedence, or multi-step expression parsing. Chaining is permitted
only by using a successful backend result as the first operand of the next
atomic request. Repeated-equals replay is not supported.

Percentage preserves the accepted API meaning:
`percentage(base, rate) = base * rate / 100`; it does not emulate contextual
physical-calculator `%` behavior. Square root is unary and uses the same
explicit equals-driven submission lifecycle as other operations.

`C` clears the complete calculation state. Backspace removes the last
character of the current editable input. A separate `CE` mode is not included.
Input composition is string-based until validation and submission so values
such as `0.`, `-0`, and small decimals remain representable.

Every symbol button has a clear accessible name. The selected operation,
entered expression, loading state, result, and errors are programmatically
available. Results and asynchronous status changes are announced without
unnecessary focus movement.

##### D22 — Calculation history

**Decision:** Accepted.

Do not include calculation history in the first release. The current result is
displayed, but prior calculations are not stored in the frontend or backend.

##### D23 — Retry policy

**Decision:** Accepted with modification.

Do not retry automatically. Preserve the user's inputs after any failure.
Offer a manual Retry action only for network failures and unexpected server
failures, not for validation or mathematical-domain errors. Retry resubmits the
current validated request and introduces no general retry framework.

##### D24 — Cancellation and stale-response behavior

**Decision:** Accepted with modification.

Starting a new calculation aborts the prior in-flight request with
`AbortController`. A local request-sequence token also prevents stale
successes or failures from updating state. Component unmount aborts the active
request. Aborted requests do not display errors or retry actions.

The previous successful result remains visible while a new request is pending,
is visually identified as previous or pending context, and is replaced only by
the current request's successful result.

##### D25 — API-error localization

**Decision:** Accepted.

The frontend maps stable API error codes to localized i18n copy. The server's
English message is diagnostic and is not the primary user-facing message.
Unknown codes use a localized generic fallback. Input-composition errors remain
local to the calculator controls; request and domain errors appear in a
programmatically announced request-level region.

##### D26 — Runtime response validation

**Decision:** Accepted with modification.

Parse API bodies as `unknown` and narrow them with small hand-written runtime
validators. Do not add a schema dependency and do not use unchecked type
assertions.

Validate all fields the frontend consumes, including operation identifiers,
operand arity, finite numeric operands, finite results, and the error envelope.
Tolerate unknown additional response properties to allow additive API
evolution. Invalid response shapes produce
`ApiError('invalidResponse', ...)`. The frontend does not recompute arithmetic
to validate backend results.

#### Testing, coverage, and delivery

##### D27 — Coverage-threshold policy

**Decision:** Accepted with clarification.

Generate coverage reports for the Go and frontend test suites, but do not
enforce a repository-wide numeric coverage threshold in the first release.

Quality is gated through behavior-focused expectations:

- every accepted calculator operation and domain failure is covered;
- every documented HTTP error/status mapping is covered;
- frontend API response validation covers valid and invalid shapes;
- frontend behavior tests cover the principal physical-calculator state
  transitions, loading, success, failure, cancellation, and accessibility
  status behavior.

CI continues to fail on test, formatting, linting, type-checking, build, or
i18n failures. Coverage commands and results are documented. A numeric
threshold may be introduced later only after the implemented baseline provides
evidence for a meaningful value.

##### D28 — Docker scope

**Decision:** Accepted with modification.

Docker support is an optional stretch deliverable and does not block core
application validation.

If implemented, use a single multi-stage full-stack image:

1. build the React application;
2. build the Go server binary;
3. copy the frontend build output and Go binary into the final image;
4. serve the frontend static assets, `/api/v1/calculations`, and `/healthz`
   from one origin.

This avoids CORS and unnecessary multi-service infrastructure. A minimal
Compose file may wrap the image for convenience but is not required. Docker
work begins only after the core application, tests, documentation, and
coverage reporting are complete.

##### D29 — Integration-test scope

**Decision:** Accepted with modification.

Use layered integration coverage:

- Go domain table tests for all accepted operations and mathematical errors;
- Go HTTP tests using `httptest` for the complete request, response, error,
  status, and header contract;
- frontend API tests with mocked `fetch` for serialization, response
  narrowing, API errors, network failures, and cancellation;
- frontend behavior tests for the physical-calculator state machine,
  backend-driven results, loading, failures, stale-response suppression, and
  accessibility behavior;
- one real-server HTTP smoke test covering `/healthz`, one successful
  calculation, and one domain failure.

Do not add browser automation in the first release. Contract examples remain
authoritative documentation; do not introduce a shared cross-language runtime
package solely for test fixtures.

#### Stage 6 reconciliation requirements

Before creating `docs/calculator-contract.md`, the implementer must update the
Stage 2 matrix and Stage 3 proposed contract so they no longer state or imply:

- only five operations;
- omission of `power` or `percentage`;
- `/v1/calculations` without the `/api` prefix;
- a 1 MiB request-body limit;
- an 11-code error vocabulary without `not_found`;
- an operation-driven form instead of a physical calculator;
- 12 maximum fraction digits instead of the accepted significant-digit
  policy;
- optional two-service Docker Compose as the preferred Docker topology;
- only mocked/layer-local integration coverage without a real-server smoke
  test.

The accepted authority created in Stage 6 must reflect this adjudication as a
single coherent contract.

### Stage 6 — Reconciliation and accepted contract

**Status:** Completed.

Actions performed under Stage 6:

1. The duplicate task file
   `docs/tasks/T-001-define-calculator-semantics-and-rest-contract-adjudicated.md`
   was consolidated into this canonical path and removed. Git history preserves
   the archival copy.
2. Reconciliation notices were added to Stage 2, Stage 3, and Stage 4 marking
   pre-adjudication recommendations as **superseded** wherever they conflict
   with Stage 5. Historical rows and prose are retained as decision history
   only; they must not be used as authority.
3. The accepted authority document
   [`docs/calculator-contract.md`](../calculator-contract.md) was authored
   from the Stage 5 decisions. It is concise, self-contained, and is the
   single source of truth for downstream implementation tasks.
4. Minimal, purpose-preserving consistency edits were applied to
   `README.md`, `docs/architecture.md`, `docs/implementation-guide.md`,
   `apps/api/README.md`, and `apps/web/src/api/README.md` to link the
   accepted contract and remove statements that said the contract was not yet
   frozen.

Independent reviews remain outstanding. In the absence of available
fresh-context reviewers, complete review prompts were authored at:

- `docs/reviews/T-001-technical-contract-review-prompt.md`;
- `docs/reviews/T-001-frontend-product-review-prompt.md`.

T-001 is therefore **In Review** and must not be marked **Validated**,
**Committed**, or **Delivered** until the two independent reviews have been
performed against `docs/calculator-contract.md` and their findings
adjudicated by Thiago.
