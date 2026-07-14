# T-001 Technical Contract Review

- **Reviewer:** Fresh-context independent reviewer (Junie/Anthropic Claude session, no participation in T-001 authoring or adjudication).
- **Review type:** Fresh-context independent review.
- **Reviewed contract:** `docs/calculator-contract.md` (Accepted authority, Stage-6 reconciled).
- **Verdict:** **PASS WITH REQUIRED CORRECTIONS**.

## Scope reviewed

- `docs/calculator-contract.md` (full document, §§1–23).
- `docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md` (Stage 5 owner adjudication D01–D29; Stage 6 reconciliation notes).
- `docs/tasks/T-002-implement-go-calculator-domain.md`, `T-003-implement-go-http-api.md`, `T-004-implement-go-server-lifecycle.md`, `T-005-implement-frontend-api-integration.md`, `T-009-integration-smoke-tests-and-coverage.md`.
- `docs/architecture.md`, `docs/implementation-guide.md`, `docs/delivery-workflow.md`, `docs/what-not-to-do.md`, `docs/ai-change-checklist.md`.
- `apps/api/README.md`, `apps/api/go.mod` (`go 1.22`), package placeholders in `apps/api/internal/calculator/doc.go`, `apps/api/internal/httpapi/doc.go`, `apps/api/cmd/server/main.go`.
- `apps/web/src/api/README.md`.
- `README.md`, `AGENTS.md`.
- `docs/reviews/T-001-technical-contract-review-prompt.md` (rubric authority).

## Accepted design strengths

- Clean three-layer split (`internal/calculator` pure domain, `internal/httpapi` transport, `cmd/server` lifecycle) with an explicit ownership matrix in §18 and enforcement in the task file-scope rules. The domain is credibly implementable without transport knowledge and vice versa.
- Small stable public surface for the domain (`type Operation string`; `Calculate(op, operands) (float64, error)`; classifiable sentinel errors) is idiomatic Go, avoids DI/registry/service-struct anti-patterns, and is directly test-owner-mapped to T-002.
- Distinct `math_domain` vs `numeric_overflow` codes are correctly split and each has an unambiguous product meaning.
- Full enumeration of the 12 error codes, each pinned to exactly one HTTP status, is unambiguous and TypeScript-narrowable without `any` or a schema-validation dependency.
- Body-size / decode / media-type gates are chosen from Go stdlib primitives that actually exist (`http.MaxBytesReader`, `json.Decoder.DisallowUnknownFields`, `decoder.More`, `mime.ParseMediaType`) and require no new dependency.
- The frontend contract §13 correctly forbids client-only arithmetic, correctly ties cancellation to `AbortController` plus a local sequence token, and correctly forbids automatic retries — all consistent with the physical-calculator interaction model in §14–§16.
- Zero-normalization policy (§5.4) is centralized in the domain, with an explicit expectation that the HTTP layer reuses a domain helper for echoed operands — no risk of divergent normalization.
- Test-ownership matrix (§18) and behavioral coverage policy (§19) place each observable behavior with exactly one primary owning layer.

## Blockers

None. No contradiction or technical impossibility renders implementation unsafe or incoherent.

## Major findings

### F-M1 — §7 row 8 mislabels the code for literal non-finite JSON tokens
- **Severity:** Major
- **Location:** `docs/calculator-contract.md` §7, row 8 ("Schema-shape check"); cross-refs §5.2 and §8.
- **Finding:** Row 8 lists "non-finite operand values" as producing `400 invalid_request`. RFC 8259 §6 does not define `NaN`, `Infinity`, or `-Infinity` as JSON number tokens, and Go's `encoding/json` rejects them structurally with a `*json.SyntaxError` before any DTO decoding occurs. Under the contract's own §8 row 1 (`invalid_json` = "body is not one well-formed JSON value"), the correct outcome for a literal `NaN` or `Infinity` in the request body is `invalid_json`, not `invalid_request`. The Stage-5 owner adjudication D04 in T-001 explicitly says so ("Literal `NaN`, `Infinity`, and `-Infinity` are invalid JSON and map to `invalid_json`"), and T-003 §Edge cases confirms the intended test uses the literal token `NaN` → `invalid_json`. The accepted contract §7 row 8 therefore contradicts both §8 and D04, giving implementers two conflicting rules.
- **Why it matters:** Two conforming implementations could route the same wire input to different HTTP codes; test authorship for T-003 has to choose sides against the contract. This is the kind of ambiguity T-001 was created to prevent.
- **Required correction:** In §7 row 8, remove "non-finite operand values" from the list. Split the parenthetical into two rules: (a) a literal `NaN` / `Infinity` / `-Infinity` token in the body — 400 `invalid_json` (rejected by the JSON parser); (b) a stringified non-finite (`"NaN"`, `"Infinity"`) or any other wrong-typed operand element — 400 `invalid_request` (`*json.UnmarshalTypeError`). Optionally cite RFC 8259 §6.
- **Authority:** RFC 8259 §6 ("Numbers"); Go `encoding/json` documentation (`Decoder.Decode` returns `*json.SyntaxError` for non-numeric tokens; `*json.UnmarshalTypeError` for type mismatches); T-001 Stage-5 D04.

### F-M2 — `power` classification cannot rely on the numeric result alone
- **Severity:** Major
- **Location:** §4.5 (`power` edge rules); §5.2 (finite-result policy).
- **Finding:** §4.5 requires `power([0, y])` with `y < 0` → `math_domain`. However, Go's `math.Pow(0, y)` for finite `y < 0` returns `+Inf` (per the `math.Pow` specification: `Pow(±0, y) = +Inf for finite y < 0` and `Pow(±0, y) = ±Inf for y an odd integer < 0`). It does not return `NaN`. Any implementation that classifies non-finite results by inspecting only the returned `float64` ("NaN → `math_domain`, ±Inf → `numeric_overflow`") — a natural reading of §5.2 — will mis-map `power([0, -1])` to `numeric_overflow`. The contract does not describe the classification algorithm and gives no explicit ordering between per-operation domain guards and post-arithmetic non-finite triage.
- **Why it matters:** The contract's `math_domain` vs `numeric_overflow` split is a first-class product decision (§8 says they "must not be merged"). A silent implementer choice determines which code is emitted for real-world inputs.
- **Required correction:** Add one sentence to §4.5 (or §5.2) making the ordering explicit: for `power`, `math_domain` is decided by structural guards **before** floating-point exponentiation, at minimum for (a) negative base with non-integer exponent and (b) zero base with negative exponent; `numeric_overflow` is decided only after those guards, from `IsInf(result)` on an otherwise-valid finite computation. Similarly note that `sqrt` classifies negative operands as `math_domain` before invoking `math.Sqrt`.
- **Authority:** Go standard-library documentation for `math.Pow` and `math.Sqrt`.

### F-M3 — "Integer exponent" test for `power` is unspecified
- **Severity:** Major
- **Location:** §4.5 ("Negative base with **integer** exponent is supported"); T-002 §"Edge cases" ("Document the exact test used").
- **Finding:** The exponent is a `float64`. Whether a given exponent is an "integer" is a semantic decision that affects observable behavior: `power([-2, 3])` is `-8`, but `power([-2, 3.0000000000000004])` (the next representable value after `3.0`) is expected to return `math_domain` per §4.5. The contract does not fix the predicate. T-002 acknowledges the gap by explicitly deferring it ("Document the exact test used"), which is the contract's job, not the implementer's. Two conforming implementations could disagree on inputs near integer values or on values above `2^53` where every `float64` is representationally integer but semantic "integerness" becomes meaningless.
- **Why it matters:** Frontend and backend will diverge on edge inputs the contract otherwise implies are supported (e.g., `power([-2, 30])`). The contract exists to remove precisely this kind of hidden implementer choice (see the "Focus areas" rubric in the review prompt).
- **Required correction:** Specify in §4.5 that the exponent is treated as an integer iff `math.Trunc(y) == y && !math.IsInf(y, 0)`. This matches Go's own internal integer detection in `math.Pow` and is trivially reproducible from `float64` on both sides of the wire. Optionally note that at magnitudes where `float64` cannot distinguish adjacent integers (`|y| ≥ 2^53`), the value is still treated as integer for the domain check, but the result is still subject to the finiteness classification in §5.2.
- **Authority:** IEEE-754 binary64 representation; Go `math.Pow` documented special cases.

### F-M4 — Default Go 1.22 `ServeMux` emits a `text/plain` body on 405
- **Severity:** Major
- **Location:** §6.4 (error envelope), §6.1 ("Any other method … returns `405 method_not_allowed` with an `Allow: POST` header"), §9 (headers), §11 (HTTP boundary). T-003 §Required implementation, step 5.
- **Finding:** `apps/api/go.mod` pins `go 1.22`. Go 1.22's method-scoped `ServeMux` handles wrong-method matches by returning `405 Method Not Allowed` with `Allow` correctly set, but the body is emitted through `http.Error` as `text/plain; charset=utf-8` — not the JSON error envelope required by §6.4, and with `Content-Type` other than `application/json; charset=utf-8`. Neither the contract §11 nor T-003 explicitly instructs the implementer to intercept the default 405 and reissue the response through the JSON envelope encoder. An implementer following T-003 to the letter (register `POST /api/v1/calculations` + `GET /healthz`, rely on the mux) will violate §6.4 and §9 for every 405 response, including the `POST /healthz` and `GET /api/v1/calculations` cases explicitly enumerated in T-003.
- **Why it matters:** Every non-2xx path must be envelope-shaped for the frontend narrower (§13) and for the smoke test (T-009) to succeed. This is not an optional polish; it is contract-observable and directly testable.
- **Required correction:** In §11 (or T-003 step 5), require that the HTTP boundary owns 405 rendering — either by wrapping the mux in a response-writer/middleware that rewrites the body when the mux writes `405`, or by explicitly registering handlers for the non-permitted method(s) on each known path (e.g., an `Allow`-setting handler that emits the JSON envelope). The requirement is: any 405 must carry `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, the correct `Allow` header, and the envelope `{"error":{"code":"method_not_allowed","message":…}}`.
- **Authority:** Go source `net/http` (`ServeMux.handler`, `Error`), Go 1.22 release notes on `ServeMux` method routing, upstream discussion `golang/go#65648`.

## Minor findings

### F-m1 — `/healthz` body shape is not pinned in the contract
- **Severity:** Minor
- **Location:** §6.1 ("Returns `200 OK` with a small, stable JSON body").
- **Finding:** The exact shape is defined only in Stage-5 D19 (`{"status":"ok"}`) and echoed in T-003 §4. The accepted contract itself does not specify it, yet promises stability. The smoke test in T-009 does not assert the body shape either.
- **Why it matters:** Downstream consumers (T-004 startup test; T-009 smoke test; frontend, if it ever probes) currently rely on a shape that lives outside the authoritative document.
- **Required correction:** State in §6.1 that `/healthz` returns exactly `{"status":"ok"}` with `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store`.
- **Authority:** T-001 Stage-5 D19.

### F-m2 — §5.2 does not state the code for decode-time non-finite rejection
- **Severity:** Minor
- **Location:** §5.2 ("`NaN` and `±Infinity` … are rejected structurally at decode").
- **Finding:** §5.2 describes the mechanism but not the resulting `error.code`. The reader must cross-consult §7 row 8 (itself in error per F-M1) and §8. A one-clause fix here closes the ambiguity independent of F-M1.
- **Required correction:** Add: "The resulting HTTP outcome is `400 invalid_json`."
- **Authority:** RFC 8259 §6; T-001 Stage-5 D04.

### F-m3 — §16.3 misclassifies transport errors as "inputs must change"
- **Severity:** Minor
- **Location:** §16.3 ("Domain failure (`422 …`, `400 invalid_request`, `413`, `415`, `405`, `404`): … Retry is not offered because the inputs must change.").
- **Finding:** `404`, `405`, `413`, and `415` are transport-level failures that cannot be resolved by changing operands from the physical-calculator UI; they only occur when the frontend is buggy or the deployment is misconfigured. Framing them as "inputs must change" is factually incorrect and provides no useful UI copy hook.
- **Why it matters:** T-006/T-007 will translate this into i18n copy and control state. Grouping unfixable-by-user errors under "must change inputs" leads to misleading messages.
- **Required correction:** Split §16.3 into (a) user-fixable domain/schema errors (`422 …`, `400 invalid_request`) — inputs must change; (b) transport/protocol errors (`404`, `405`, `413`, `415`) — surfaced as a generic non-retryable diagnostic ("The request could not be processed. Please refresh the app.") without a Retry action. Retryable set (network, `500 internal_error`) is unchanged.
- **Authority:** RFC 9110 §15.5.5 (404), §15.5.6 (405), §15.5.14 (413), §15.5.16 (415).

### F-m4 — Gate ordering in §7 is described as sequential but is actually decoder-time classification
- **Severity:** Minor
- **Location:** §7 rules 3–8.
- **Finding:** `http.MaxBytesReader` does not pre-scan the body; it wraps the reader and returns a `*http.MaxBytesError` on the read that crosses the limit — usually mid-decode. Similarly `DisallowUnknownFields`, syntax errors, and type mismatches are all raised by a single `Decode` call and must be classified from the returned error type. The "gate" numbering suggests a pipeline that does not exist and slightly misleads T-003 implementers.
- **Required correction:** Add one sentence to §7 clarifying that rules 3–8 are enforced by a single `json.Decoder` pipeline reading through `http.MaxBytesReader`, and their codes are chosen by inspecting the returned error type (per T-003 step 6). Method (rule 1) and Content-Type (rule 2) gates run before the decoder.
- **Authority:** Go standard-library documentation for `net/http.MaxBytesReader`, `net/http.MaxBytesError`, `encoding/json.Decoder`.

### F-m5 — Zero-normalization ownership of echoed operands crosses the boundary
- **Severity:** Minor
- **Location:** §5.4 and §10.
- **Finding:** §10 says "Zero normalization happens here [in the domain] for the returned result and for any operands echoed by the HTTP layer (which must call a small helper or do the same normalization)." §5.4 says only "successful zero-valued results" and "zero operands echoed in responses". The domain (`Calculate`) does not see the response DTO, so echo-normalization is de facto the HTTP layer's job — using a domain helper. This is well-specified in T-002 (`NormalizeZero`) and T-003 step 3.8, but the contract is slightly indirect. Also, `math.Sqrt(-0.0) == -0.0` in Go, so the result path must normalize even successful results that transit `-0`.
- **Required correction:** In §5.4, add: "The domain exports a `NormalizeZero(float64) float64` helper; the HTTP layer calls it on every echoed operand and on the returned result. Internal arithmetic may yield `-0` (notably `sqrt(-0) = -0` under IEEE-754); it is normalized before encoding."
- **Authority:** IEEE-754 signed zero; Go `math.Sqrt` documentation.

### F-m6 — 16 KiB boundary condition is not stated inclusively
- **Severity:** Minor
- **Location:** §7 rule 3 and §20.
- **Finding:** `http.MaxBytesReader(w, r.Body, 16<<10)` permits exactly 16 384 bytes; only reading the 16 385th byte fails. The contract says "larger than 16 KiB", which is consistent but not explicit. T-003's test uses "16 KiB + 1", which agrees.
- **Required correction:** Reword §7 rule 3 to "requests **strictly greater than 16 384 bytes** are rejected with `413 payload_too_large`" for symmetry with the stdlib behavior.
- **Authority:** Go `net/http.MaxBytesReader` documentation.

### F-m7 — Frontend narrower behavior for unknown `error.code` is not in the contract
- **Severity:** Minor
- **Location:** §13.
- **Finding:** T-005 requires that an unknown `error.code` be surfaced as `apiError` with a fallback code and a preserved `rawCode` string. The contract §13 does not state this; it lists the 12 codes as a closed union without describing the narrower's behavior when a server sends something outside the union.
- **Required correction:** Add to §13: "If a non-2xx response carries an `error.code` outside the 12 accepted codes, the narrower falls back to a stable local code (`internal_error`) and preserves the received string in `rawCode` for diagnostic reporting. Unknown-code responses are never silently coerced without preservation."
- **Authority:** T-005 §"Required implementation".

### F-m8 — Frontend precision policy wording drifts between §5.5 and D07
- **Severity:** Minor
- **Location:** §5.5 vs T-001 Stage-5 D07.
- **Finding:** §5.5 says "Precision cap: up to 15 significant digits". D07 says "a target maximum of 15 significant digits" and adds "Unnecessary trailing zeros are omitted". These are compatible but drift in wording; §5.5 does not mention trailing-zero suppression.
- **Required correction:** Import D07's "Unnecessary trailing zeros are omitted" clause into §5.5 for parity, or state that presentation details beyond the 15-digit cap are a documented frontend implementation choice in the calculator feature (currently §5.5 says only the notation threshold is such a choice).
- **Authority:** T-001 Stage-5 D07.

## Cross-document inconsistencies

1. §7 row 8 (invalid_request for non-finite operand values) contradicts §8 (invalid_json for non-well-formed JSON), Stage-5 D04, and T-003's own test plan. See F-M1.
2. §5.2's "rejected structurally at decode" does not name the code; §7 row 8 says one thing, D04 says another. See F-M2 / F-m2.
3. §4.5 requires `math_domain` for `power([0, negative])`, but §5.2's generic non-finite classification (NaN → domain, Inf → overflow) would produce `numeric_overflow` for `math.Pow(0, -1) = +Inf`. See F-M2.
4. §4.5 accepts "integer exponent" without defining the predicate; T-002 delegates the choice back to the implementer. See F-M3.
5. §6.4 / §9 require the JSON envelope on every non-2xx; Go 1.22 `ServeMux` default 405 emits plain text. Neither §11 nor T-003 requires the boundary to intercept it. See F-M4.
6. §6.1 promises a "small, stable" `/healthz` body but does not fix the shape; only Stage-5 D19 and T-003 do. See F-m1.
7. §16.3's "inputs must change" framing includes `404` / `405` / `413` / `415`, which the physical-calculator user cannot fix. See F-m3.
8. §5.5 vs D07 on trailing-zero suppression. See F-m8.
9. §13 does not specify unknown-`error.code` handling that T-005 requires. See F-m7.

## Required corrections

The following are the minimal edits required for the contract to be considered technically reviewed (severity Major or higher):

1. Rewrite §7 row 8 per F-M1 to separate `invalid_json` (parser-rejected non-finite tokens) from `invalid_request` (schema/type errors including stringified non-finite operands).
2. Add classification ordering to §4.5 / §5.2 per F-M2, so that `math_domain` is decided by structural guards before floating-point exponentiation.
3. Fix the `power` integer-exponent predicate in §4.5 per F-M3 (`math.Trunc(y) == y && !math.IsInf(y, 0)`).
4. State in §11 (and reflect in T-003) that the HTTP boundary must own JSON-envelope rendering for 405 responses, since Go 1.22 `ServeMux` defaults emit `text/plain`. See F-M4.

## Optional improvements

- Pin `/healthz` body to `{"status":"ok"}` in §6.1 (F-m1).
- State the code (`invalid_json`) directly in §5.2 (F-m2).
- Split §16.3 retryability by user-fixable vs transport-level errors (F-m3).
- Reword §7 to reflect decoder-time error classification (F-m4).
- Make zero-normalization ownership explicit in §5.4, and note `sqrt(-0)`'s IEEE-754 result (F-m5).
- State the 16 KiB boundary inclusively (F-m6).
- Document unknown-`error.code` handling in §13 (F-m7).
- Harmonize §5.5 with D07's trailing-zero clause (F-m8).
- Consider one-line acknowledgment that accepting last-value-wins on duplicate JSON members (§7 rule 6) is a documented deviation from RFC 7493 §2.3 (I-JSON) but permitted by RFC 8259. This is not a correction — it is a clarity note for future reviewers.

## Primary sources consulted

- RFC 8259 (JSON): §6 (Numbers — `NaN` / `Infinity` are not JSON tokens), §4 (Objects — duplicate members are permitted but discouraged).
- RFC 7493 (I-JSON): §2.3 (Objects — unique keys recommendation).
- RFC 9110 (HTTP Semantics): §8.3 (Content-Type), §15.5.5 (404), §15.5.6 (405 with `Allow`), §15.5.14 (413), §15.5.16 (415).
- Go standard library documentation (Go 1.22):
  - `encoding/json` — `Decoder`, `Decoder.DisallowUnknownFields`, `Decoder.More`, `*json.SyntaxError` (for invalid JSON tokens including `NaN` / `Infinity`), `*json.UnmarshalTypeError` (for type mismatches), duplicate-member behavior (last-value-wins into struct fields).
  - `net/http` — `MaxBytesReader`, `MaxBytesError`, `ServeMux` method-scoped routing and its 405/`Allow` handling (Go 1.22 release notes), default `Error` body (`text/plain; charset=utf-8`).
  - `mime` — `ParseMediaType` (case-insensitive type/subtype, RFC-compliant parameter handling).
  - `math` — `Pow` special cases (`Pow(0, y) = +Inf for finite y < 0`), `Sqrt` (`Sqrt(-0) = -0`), `Trunc`, `IsInf`.
- IEEE-754 (binary64): signed zero and `x^y` behavior around negative and zero bases.
- Upstream Go proposal `golang/go#65648` — confirmed absence of built-in support for custom 405 / 404 bodies through `ServeMux`; middleware/interception required.

## Final verdict rationale

The accepted contract is internally coherent on the large-scale architectural decisions (three-layer split, closed error vocabulary, strict decoding, no client arithmetic, no CORS/auth/persistence, no runtime fake, no schema library). It is directly implementable by T-002 onwards with Go's standard library alone and by T-005 with hand-written narrowers.

However, four Major issues create observable ambiguity that implementers cannot resolve without reopening the contract:

- F-M1 forces implementers to choose between §7 and §8 for the same wire input.
- F-M2 leaves the `math_domain` vs `numeric_overflow` boundary underspecified precisely where Go's `math.Pow` disagrees with the naive classifier suggested by §5.2.
- F-M3 delegates the integer-exponent predicate to the implementer; T-002 makes that gap explicit.
- F-M4 leaves an off-contract `text/plain` response body on 405 for any implementation that uses the Go 1.22 `ServeMux` as specified.

None of these is an architectural blocker. Each is textually correctable with one to three sentences in the accepted document and, in one case (F-M4), a matching one-line requirement in T-003. On that basis the verdict is **PASS WITH REQUIRED CORRECTIONS**.

The remaining minor findings are clarity or precision improvements. The empty Blockers section is deliberate: nothing in the contract prevents T-002 through T-009 from being started, but the Major corrections should land before those tasks move from Draft to Ready.
