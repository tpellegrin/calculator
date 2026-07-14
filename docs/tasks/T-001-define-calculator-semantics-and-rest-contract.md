# T-001 — Define calculator semantics and REST contract

- **Status**: Ready
- **Depends on**: Monorepo foundation commit (`apps/web` frontend foundation, `apps/api` Go workspace boundary, `docs/` authorities).
- **Owner**: Thiago
- **Reviewer**: Thiago

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
