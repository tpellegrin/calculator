# T-001 Frontend and Product Review

- **Reviewer:** Junie (LLM-based autonomous reviewer, Gemini 3 Flash)
- **Review type:** Fresh-context independent review
- **Reviewed contract:** `docs/calculator-contract.md`
- **Verdict:** PASS WITH REQUIRED CORRECTIONS

## Scope reviewed

*   `docs/calculator-contract.md` (Authority)
*   `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md` (Decision history)
*   Downstream tasks: `T-005` (API), `T-006` (State), `T-007` (UI), `T-008` (Wiring), `T-009` (Integration), `T-010` (Documentation), `T-012` (Validation).
*   Frontend foundation: `apps/web/src/api/`, `apps/web/src/components/`, `apps/web/src/containers/`, `apps/web/src/i18n/`, `apps/web/src/styles/`.
*   Cross-cutting documentation: `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/frontend-foundation.md`, `docs/implementation-guide.md`, `docs/delivery-workflow.md`, `docs/what-not-to-do.md`, `docs/ai-change-checklist.md`.

## Accepted design strengths

*   **Strict Separation of Concerns:** The boundary between the Go arithmetic domain and the React interface is exceptionally clear. The "no client-side arithmetic" rule is a strong architectural anchor that prevents logic drift.
*   **Robust Error Model:** Mapping stable backend error codes to localized frontend messages is a best-practice pattern for internationalized applications.
*   **Minimalist Core:** The decision to avoid heavy monorepo tools and complex data-fetching libraries for a single-endpoint application is appropriate and reduces maintenance overhead.
*   **Explicit State Machine:** `T-006` provides a highly detailed roadmap for the physical-calculator state machine, which will significantly reduce ambiguity for implementation models.

## Blockers

*   None. The contract and tasks are implementable as described.

## Major findings

*   **ID: F-001**
    *   **Severity:** Major
    *   **Location:** `docs/calculator-contract.md` §14, §16; `docs/tasks/T-006` §80.
    *   **Finding:** Interaction between Unary `√` and Binary operations is ambiguous.
    *   **Why it matters:** On a physical calculator, unary operations often apply to the current buffer. Since the backend is authoritative, applying `√` to a buffer during a binary operation (e.g., `1 + 9 √`) would require a separate request. The contract says "Exactly one request per `=`". This implies `1 + 9 √` cannot be calculated in one submission. If the user presses `√` while a binary operation is pending, it's unclear if it should be ignored, replace the current operation, or if the UI should prevent it.
    *   **Required correction:** Clarify that unary `√` is a top-level operation that replaces any pending binary operation if triggered, or explicitly disallow it when a binary operator is already selected.

*   **ID: F-002**
    *   **Severity:** Major
    *   **Location:** `docs/calculator-contract.md` §14; `docs/tasks/T-006` §82.
    *   **Finding:** Sign Toggle (`±`) on backend results is undefined.
    *   **Why it matters:** `T-006` states `signToggle` "flips a leading `-` on the buffer without touching the last submitted result". This means a user cannot negate a result to use it in a subsequent operation (e.g., Result `5` -> `±` -> `-5`). While the user could multiply by `-1`, the standard physical-calculator expectation is that `±` negates the displayed value. However, negating a result would violate the "no client-side arithmetic" rule unless a new API operation is added.
    *   **Required correction:** Explicitly state that `±` is an input-buffer-only operation and cannot be applied to backend results.

*   **ID: F-003**
    *   **Severity:** Major
    *   **Location:** `docs/calculator-contract.md` §14, §16.1.
    *   **Finding:** Multi-step chaining without intermediate `=` is impossible.
    *   **Why it matters:** The rule "Exactly one request per `=`" and "Chaining is permitted only by using a successful backend result" prevents users from typing `1 + 2 + 3 =`. They must type `1 + 2 =`, then `+ 3 =`. While this is a "binding" product choice, its impact on the "physical calculator" metaphor is severe enough that implementers might try to work around it by triggering requests on operator presses.
    *   **Required correction:** Explicitly state in §14 that binary operator keys *never* trigger a backend request and that multi-step expressions require intermediate `=` presses.

## Minor findings

*   **ID: F-004**
    *   **Severity:** Minor
    *   **Location:** `docs/calculator-contract.md` §5.5, §17.
    *   **Finding:** Scientific notation threshold is undefined.
    *   **Why it matters:** Leaving the "frontend implementation choice" for the scientific notation threshold might lead to inconsistent display across different implementations.
    *   **Required correction:** Provide a suggested threshold (e.g., absolute values ≥ 10^12 or < 10^-6) in §5.5.

*   **ID: F-005**
    *   **Severity:** Minor
    *   **Location:** `docs/tasks/T-007` §86.
    *   **Finding:** Locale-aware decimal key mapping is potentially too restrictive.
    *   **Why it matters:** `T-007` suggests only the locale's specific decimal separator (e.g., `,` for `pt-BR`) maps to the `decimal` action. Users with physical keyboards often have a `.` on the numpad regardless of their OS locale.
    *   **Required correction:** Suggest mapping both `.` and `,` to the `decimal` action regardless of locale, while still *displaying* the locale-correct separator.

## Physical-calculator state-machine gaps

*   **Operator Replacement:** The contract and `T-006` should explicitly confirm that pressing a binary operator while one is already pending (but before the second operand buffer is started) replaces the pending operator.
*   **Success to Unary Transition:** `T-006` defines chaining for binary operators but should explicitly confirm that pressing `√` after a successful result seeds that result into a `unarySqrtPending` state.
*   **Backspace on Operator:** Clarify if `⌫` when the buffer is empty in a `binary` state removes the operator and returns to the `entry` state for the first operand. (T-006 §126 hints at this, but it should be explicit).

## Accessibility findings

*   **WCAG 2.2 Alignment:** The proposed live-region and error-identification strategy aligns well with Success Criterion 4.1.3 (Status Messages) and 3.3.1 (Error Identification).
*   **Focus Management:** `T-007` should specify that after a `clear` (`C`) action, focus should be reset to a logical starting point (e.g., the keypad or the display) to assist keyboard users.
*   **Accessible Names:** Ensure that operator buttons use localized accessible names (e.g., "plus", "divided by") via `aria-label` to provide context beyond the symbol character.

## Localization and formatting findings

*   **Pseudo-locale Expansion:** Numeric results themselves do not usually expand, but the "Previous Result" label and error messages will. Ensure the layout remains stable under pseudo-locale expansion.
*   **Number Format Precision:** Confirm that `maximumSignificantDigits: 15` in `Intl.NumberFormat` meets the contract requirement §5.5 across all target browsers.

## Cross-document inconsistencies

*   **Retry Policy:** `docs/calculator-contract.md` §13 says "No automatic retries", and §16.3 says "manual Retry affordance is shown". `T-005` says "No retries anywhere in this module". This is consistent (API layer is pure, UI layer handles retry).
*   **Endpoint Path:** `T-001` decision `D09` and `calculator-contract.md` §6.1 correctly identify `POST /api/v1/calculations`.

## Required corrections

1.  (Major) Clarify interaction of `√` with pending binary operations in `docs/calculator-contract.md` §14.
2.  (Major) Explicitly define that `±` does not apply to backend results in `docs/calculator-contract.md` §14.
3.  (Major) Strengthen the "Exactly one request per `=`" rule in `docs/calculator-contract.md` §16.1 to explicitly forbid requests on operator presses.
4.  (Minor) Define a suggested scientific notation threshold in `docs/calculator-contract.md` §5.5.

## Optional improvements

1.  Map both `.` and `,` to the decimal separator for better physical keyboard compatibility.
2.  Add a `negate` operation to the backend to allow `±` to work on results, if the product requirement for "physical calculator feel" outweighs the "minimal operations" goal.

## Primary sources consulted

*   [WCAG 2.2 - Success Criterion 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
*   [WCAG 2.2 - Success Criterion 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
*   [W3C WAI - ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
*   [MDN - Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

## Final verdict rationale

The contract and downstream tasks provide a robust and implementable foundation. The "no client-side arithmetic" rule is well-protected. However, the physical-calculator metaphor introduces subtle interaction ambiguities (unary/binary mixing, sign-toggling results, multi-step chaining) that must be explicitly resolved in the authority document to prevent implementation drift or "invention" of behavior by downstream models. With the required clarifications, the contract is ready for implementation.

**Final Verdict:** PASS WITH REQUIRED CORRECTIONS
