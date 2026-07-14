# What not to do

Opening intent:

This document records project-specific anti-patterns that would weaken correctness, maintainability, or the frontend/backend boundary. It complements the architecture and delivery workflow; it does not replace them.

## 1. Do not duplicate arithmetic in the frontend

- Authoritative arithmetic belongs in `apps/api/internal/calculator`.
- React must request results through the API.
- Frontend-only arithmetic may appear only for display formatting or input assistance, never as the source of calculation truth.
- Duplicating domain rules causes drift between frontend and backend.

## 2. Do not put HTTP concerns in the calculator domain

`apps/api/internal/calculator` must not know about:

- HTTP methods;
- Status codes;
- JSON;
- Request or response objects;
- Headers;
- Routing;
- Transport-specific error messages.

The Go domain should return domain values and domain errors. HTTP mapping belongs in `apps/api/internal/httpapi`.

## 3. Do not trust frontend validation

- Frontend validation improves user experience.
- Backend validation is authoritative.
- Requests may come from clients other than the React app.
- Malformed data, invalid operand counts, unsupported operations, division by zero, and non-finite values must be rejected server-side.

## 4. Do not return ad hoc error strings

The API should eventually use:

- Stable machine-readable error codes;
- Clear human-readable messages;
- Consistent JSON structure;
- Deliberate HTTP status mapping.

Do not freeze the exact error taxonomy in this file because that belongs to the upcoming contract task.

## 5. Do not add a runtime fake backend

- The real Go service will be available early.
- A second runtime API implementation would duplicate the contract.
- Frontend tests may mock fetch or the frontend API boundary.
- Local development and integration should use the real Go API.
- Do not add MSW, JSON Server, Express mock endpoints, Vite mock routes, or runtime fake/real switches without an explicitly approved need.

## 6. Do not reintroduce removed systems without a real requirement

The following systems have been intentionally removed and should not be reintroduced without a concrete need and explicit authorization:

- Routing;
- TanStack Query;
- Authentication;
- Onboarding;
- Route-transition infrastructure;
- Global navigation state;
- Capacitor;
- GitHub Pages deployment;
- Heavyweight monorepo tooling.

These may be reintroduced only when an implemented feature creates a concrete need, the change is explicitly scoped, documentation is updated, and costs are justified.

## 7. Do not create speculative abstraction layers

Avoid:

- Repository interfaces when no persistence exists;
- Dependency-injection frameworks;
- Shared packages without two real consumers;
- Operation registries more complex than the behavior requires;
- Generic service layers wrapping a single function;
- Code generation before contract drift is a demonstrated problem.

Simple, testable code is preferred over pattern demonstration.

## 8. Do not claim financial precision

- This is a general calculator.
- Binary floating-point behavior must be documented honestly.
- Do not describe float64 results as suitable for monetary ledgers.
- Do not imply payment-grade decimal guarantees unless a later decision explicitly introduces them.

## 9. Do not translate stable domain identifiers

- Operation identifiers;
- API error codes;
- JSON property names;
- Internal enum or constant values must remain stable and language-neutral.
- Only user-facing labels and messages belong in i18n locale files.

## 10. Do not hide AI involvement or surrender judgment to it

- Prompts used must be recorded in `docs/ai-usage.md`.
- AI implementation and review are advisory.
- Review findings are adjudicated by the project owner.
- Generated code must be understood, tested, and manually inspected.
- The same implementation context must not count as the only independent review for nontrivial work.

## 11. Do not mix unrelated cleanup into bounded tasks

- Tasks should produce coherent, reviewable diffs.
- Unrelated refactoring must be deferred or separately scoped.
- Incidental cleanup is acceptable only when required to complete the task safely.

## 12. Do not make documentation claim unimplemented behavior

- Planned and implemented behavior must be clearly distinguished.
- README examples must match real behavior.
- Temporary status language must be updated by the task that makes it obsolete.
- Tests and commands must be real.

## 13. Do not weaken validation to obtain a green build

Explicitly prohibited:

- Adding broad lint ignores;
- Using `any` to bypass typing;
- Deleting meaningful tests;
- Lowering coverage or validation expectations without rationale;
- Disabling Stylelint or i18n checks;
- Swallowing backend errors.

## References

- [Architecture Guide](./architecture.md)
- [Delivery Workflow](./delivery-workflow.md)
- [AI Change Checklist](./ai-change-checklist.md)
- [Implementation Guide](./implementation-guide.md)
- [Frontend Foundation](./frontend-foundation.md)
