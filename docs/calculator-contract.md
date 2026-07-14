# Calculator contract

**Status:** Accepted authority.
**Governs:** the Go arithmetic domain, the Go HTTP boundary, the frontend
API layer, and the calculator feature across the repository.
**Precedence:** this document supersedes any earlier proposed contract
statements. Historical rationale and rejected alternatives live in
[`docs/tasks/T-001-define-calculator-semantics-and-rest-contract.md`](./tasks/T-001-define-calculator-semantics-and-rest-contract.md).
Independent reviews of this contract are pending; see
[`docs/reviews/`](./reviews/).

---

## 1. Purpose and authority

This document is the single source of truth for the calculator's product
semantics, HTTP contract, error taxonomy, numeric policy, frontend
interaction model, and test-ownership matrix. Downstream tasks
(T-002..T-012) implement to this contract; where they need latitude, this
document says so explicitly.

Owner: Thiago. Changes require an explicit owner decision, not
implementer discretion.

## 2. Accepted product scope

The first release ships **seven** operations. There is no phase-two
deferral inside T-001's scope.

- Required: `add`, `subtract`, `multiply`, `divide`.
- Optional (also required in the first release by owner decision):
  `power`, `sqrt`, `percentage`.

Non-goals:

- free-form expressions, parentheses, operator precedence;
- calculation history, memory, or persistence;
- repeated-equals replay;
- contextual physical-calculator `%` behavior;
- monetary, ledger, currency, or exact-decimal guarantees;
- client-only arithmetic for any accepted operation;
- authentication, authorization, users, sessions;
- a database, queue, cache, or gateway;
- a runtime fake backend;
- browser automation in the first release;
- CORS in the first release.

## 3. Operation table

| Identifier    | Arity  | Operand order and meaning                | Formula                          |
| ------------- | ------ | ---------------------------------------- | -------------------------------- |
| `add`         | binary | `[a, b]` — augend, addend                | `a + b`                          |
| `subtract`    | binary | `[a, b]` — minuend, subtrahend           | `a - b`                          |
| `multiply`    | binary | `[a, b]` — multiplicand, multiplier      | `a * b`                          |
| `divide`      | binary | `[a, b]` — dividend, divisor             | `a / b`                          |
| `power`       | binary | `[base, exponent]`                       | `base ^ exponent` (see §4.5)     |
| `sqrt`        | unary  | `[x]` — radicand                         | `√x`                             |
| `percentage`  | binary | `[base, rate]` — base and percentage rate | `base * rate / 100`             |

Any other value of `operation` is `unsupported_operation`. Any operand
count that does not match the operation's arity is `invalid_operands`.

## 4. Operation semantics and edge cases

Numeric rules from §5 apply to every operation.

### 4.1 `add`, `subtract`, `multiply`

- All finite inputs are valid.
- If the finite-arithmetic result overflows `float64` to `±Inf`, return
  `numeric_overflow`.
- Examples:
  - `add([1, 2]) → 3`
  - `subtract([0, 5]) → -5`
  - `multiply([1e200, 1e200]) → numeric_overflow`

### 4.2 `divide`

- If the divisor is `0` (positive or negative zero), return
  `division_by_zero`. This applies before overflow classification.
- Otherwise the result must be finite; if it is not, return
  `numeric_overflow`.
- Examples:
  - `divide([10, 4]) → 2.5`
  - `divide([1, 0]) → division_by_zero`
  - `divide([1, -0]) → division_by_zero`
  - `divide([1e308, 1e-308]) → numeric_overflow`

### 4.3 `sqrt`

- Domain: `x ≥ 0`. `sqrt([negative]) → math_domain`.
  Negative operands are rejected by a structural guard **before**
  invoking `math.Sqrt`.
- `sqrt([0]) → 0` (normalized to positive zero per §5.4). Note
  IEEE-754 defines `sqrt(-0) = -0`; the domain normalizes the sign of
  a successful zero result before it becomes observable (§5.4).
- `sqrt([2]) → 1.4142135623730951`.

### 4.4 `percentage`

- Formula: `percentage(base, rate) = base * rate / 100`.
- Not contextual, not a calculator-key `%` behavior.
- Rate may be negative, zero, or greater than 100 as long as the result
  is finite; otherwise `numeric_overflow`.
- Examples:
  - `percentage([200, 15]) → 30`
  - `percentage([50, 0]) → 0`
  - `percentage([-40, 25]) → -10`
  - `percentage([1e300, 1e10]) → numeric_overflow`

### 4.5 `power`

Base cases and edge rules:

- `power([0, 0]) → 1` (by definition; do not return `math_domain`).
- `power([x, 1]) → x`; `power([x, 0]) → 1` for finite `x`.
- Negative base with **integer** exponent is supported:
  `power([-2, 3]) → -8`, `power([-2, 2]) → 4`.
- Negative base with **non-integer** exponent returns `math_domain`
  (would be complex): `power([-2, 0.5]) → math_domain`.
- Negative exponent is supported when the result is finite:
  `power([2, -2]) → 0.25`.
- `power([0, -1]) → math_domain` (zero to a negative exponent). This
  case must be classified by an explicit structural guard **before**
  invoking `math.Pow`, because Go's `math.Pow(0, y)` with finite `y < 0`
  returns `+Inf`, which the naive post-arithmetic classifier would
  otherwise mis-map to `numeric_overflow`.
- Overflow (`|result|` exceeds finite `float64` range) returns
  `numeric_overflow`: `power([10, 1000]) → numeric_overflow`.
- Complex results are unsupported; the domain never returns imaginary
  values.

**Integer-exponent predicate.** For `power`, the exponent `y` is
treated as an integer iff `math.Trunc(y) == y`. Because operands are
already required to be finite (§5.2), the equivalent explicit form is
`math.Trunc(y) == y && !math.IsInf(y, 0)`. This is exact float64
classification — it is not a tolerance-based test. Therefore:

- `3.0` is integer;
- `3.0000000000000004` (the next representable float64 above `3.0`) is
  not integer, so `power([-2, 3.0000000000000004]) → math_domain`.

At magnitudes where binary64 cannot represent adjacent integers (for
example `|y| ≥ 2^53`), the represented finite value is still classified
by the same predicate and the result remains subject to §5.2
finiteness classification.

**Classification ordering for `power`.** Domain guards run before
`math.Pow`; the finite/overflow classifier of §5.2 applies only after
the guards permit the call:

1. If `base < 0` and the exponent is not integer per the predicate
   above → `math_domain`.
2. If `base == 0` (positive or negative zero) and `exponent < 0` →
   `math_domain`.
3. Otherwise invoke `math.Pow`. A finite result is success. A
   non-finite result is classified by §5.2 (`+Inf`/`-Inf` from finite
   inputs → `numeric_overflow`; an unexpected `NaN` from an otherwise
   unguarded domain case → `math_domain`, though every known domain
   case is guarded above).

## 5. Numeric policy

### 5.1 Representations

- Go: `float64`.
- JavaScript: `number`.
- Wire: JSON numbers per RFC 8259.
- No monetary, ledger, or exact-decimal guarantee. Users must not treat
  the calculator as a financial engine.

### 5.2 Finite-value policy

- Operands must be **finite** JSON numbers. `NaN`, `Infinity`, and
  `-Infinity` are not valid JSON tokens per RFC 8259 §6 and are
  rejected structurally by the JSON parser before any DTO decoding
  occurs. The resulting HTTP outcome is **`400 invalid_json`**, not
  `invalid_request`. Stringified non-finite values (`"NaN"`,
  `"Infinity"`), `null`, booleans, arrays, objects, and other
  wrong-typed operand elements are valid JSON but invalid request
  representations and return **`400 invalid_request`** (see §7).
- Results must be finite. Non-finite results map to `math_domain`
  (mathematically undefined, e.g. `sqrt(-1)`) or `numeric_overflow`
  (finite math but exceeded `float64`). Operation-specific structural
  guards run **before** the underlying floating-point call (see §4.3
  and §4.5); the finite/non-finite classifier only applies to results
  those guards permitted.

### 5.3 No backend presentation rounding

- The backend never rounds successful results. It returns the exact
  `float64` produced by the arithmetic.
- Display formatting is exclusively a frontend concern (§5.5).

### 5.4 Zero normalization

- Successful zero-valued results are normalized to positive zero
  before encoding (`-0 → 0`).
- Zero operands are echoed back in responses normalized to positive
  zero.
- Internal arithmetic may transit `-0` (notably `math.Sqrt(-0) = -0`
  under IEEE-754); the observable contract shows only `0`.
- Ownership: the Go domain exports a `NormalizeZero(float64) float64`
  helper. The domain calls it on every successful result before
  returning; the HTTP layer calls the same helper on every echoed
  operand and on the returned result before encoding. Successful and
  echoed zeros therefore share one normalization implementation.

### 5.5 Frontend display

- Localized via `Intl.NumberFormat` bound to the active locale.
- Precision cap: **up to 15 significant digits**. Unnecessary trailing
  zeros are omitted (for example `2.5`, not `2.500000000000000`).
- Scientific notation is used for extreme magnitudes when normal
  notation would be misleading or unwieldy (the threshold is a
  frontend implementation choice, documented in the calculator feature).
- The frontend must not derive results by re-doing arithmetic; it
  formats what the backend returned.

## 6. Request and response contract

### 6.1 Endpoints

- `POST /api/v1/calculations` — perform one calculation.
- `GET  /healthz` — liveness probe. Returns `200 OK` with exactly the
  JSON body `{"status":"ok"}` (`Content-Type: application/json;
  charset=utf-8`, `Cache-Control: no-store`). Not versioned.

Any other method on `/api/v1/calculations` returns `405
method_not_allowed` with an `Allow: POST` header.
Any other method on `/healthz` returns `405 method_not_allowed` with an
`Allow: GET` header. Any other path returns `404 not_found`.

Every `405` response must carry the standard error envelope (§6.4) and
the project header discipline (§9); see §11 for boundary ownership.

### 6.2 Request

Media type: `application/json` (media-type parameters such as
`charset=utf-8` are permitted).

```json
{
  "operation": "divide",
  "operands": [10, 4]
}
```

- `operation`: required, string, one of the identifiers in §3.
- `operands`: required, array of finite JSON numbers whose length
  matches the operation's arity.

### 6.3 Success response

`200 OK`, `Content-Type: application/json; charset=utf-8`:

```json
{
  "operation": "divide",
  "operands": [10, 4],
  "result": 2.5
}
```

Echoed `operation` and `operands` reflect zero normalization
(§5.4). No additional fields are guaranteed; frontend consumers must
tolerate unknown additional fields.

### 6.4 Error response

Every non-2xx response uses the project-owned envelope:

```json
{
  "error": {
    "code": "division_by_zero",
    "message": "Division by zero is not allowed."
  }
}
```

- `error.code`: one of the codes in §8. Stable, machine-readable.
- `error.message`: server-side diagnostic string. Not localized; the
  frontend localizes by `code`.

## 7. Validation rules

The HTTP boundary enforces these before the domain is invoked.

Rules 1–2 are enforced by explicit gates. Rules 3–8 are enforced by a
single `json.Decoder` pipeline reading through `http.MaxBytesReader`;
their codes are chosen by inspecting the returned error type (see
T-003). `http.MaxBytesReader` does not pre-scan the body — it wraps
the reader and surfaces `*http.MaxBytesError` on the read that crosses
the limit, usually mid-decode.

1. **Method gate.** Only `POST` on `/api/v1/calculations`.
2. **Content-Type gate.** Must be `application/json`, ignoring valid
   parameters; missing/other types → `415 unsupported_media_type`.
3. **Body-size gate.** Requests **strictly greater than 16 384 bytes**
   are rejected with `413 payload_too_large` (`http.MaxBytesReader`
   permits exactly 16 384 bytes; only the 16 385th byte triggers
   rejection).
4. **Single JSON value.** The body must be exactly one complete JSON
   value. Trailing data → `400 invalid_json`.
5. **Strict JSON decoding.** `json.Decoder.DisallowUnknownFields()` is
   enabled; unknown top-level or nested fields → `400 invalid_request`.
6. **Duplicate members.** Standard Go `encoding/json` behavior is
   accepted (last value wins). No custom duplicate-member parser.
7. **Well-formed JSON.** Parse errors → `400 invalid_json`. This
   includes any literal `NaN`, `Infinity`, or `-Infinity` token in the
   body: those tokens are not defined by RFC 8259 §6, so
   `encoding/json` returns `*json.SyntaxError` and the outcome is
   `invalid_json`, never `invalid_request`.
8. **Schema-shape check.** Missing/wrong-typed required fields, or
   wrong operand element types — stringified non-finite values
   (`"NaN"`, `"Infinity"`), `null`, booleans, arrays, objects, and
   other wrong-typed operand elements — → `400 invalid_request`
   (`*json.UnmarshalTypeError`). Literal non-finite JSON tokens are
   handled by rule 7, not this rule.
9. **Operation vocabulary.** Unknown `operation` value →
   `422 unsupported_operation`.
10. **Arity check.** Operand count vs arity (§3) →
    `422 invalid_operands`.
11. **Domain checks.** `division_by_zero`, `math_domain`,
    `numeric_overflow` per §4.

## 8. Error vocabulary and status matrix

| HTTP | `error.code`              | When                                                            |
| ---- | ------------------------- | --------------------------------------------------------------- |
| 400  | `invalid_json`            | Body is not one well-formed JSON value, including any literal `NaN`/`Infinity`/`-Infinity` token rejected by the JSON parser |
| 400  | `invalid_request`         | Schema violation, unknown fields, wrong operand types (including stringified `"NaN"`/`"Infinity"`)                          |
| 404  | `not_found`               | Unknown path                                                    |
| 405  | `method_not_allowed`      | Wrong method on a known path (`Allow` header set)               |
| 413  | `payload_too_large`       | Body exceeds 16 KiB                                             |
| 415  | `unsupported_media_type`  | Content-Type is not `application/json` (parameters allowed)     |
| 422  | `unsupported_operation`   | `operation` is not one of §3                                    |
| 422  | `invalid_operands`        | Operand count/shape/finiteness fails after decoding             |
| 422  | `division_by_zero`        | `divide` with zero divisor                                      |
| 422  | `math_domain`             | Mathematically undefined per §4                                 |
| 422  | `numeric_overflow`        | Finite math whose result escapes `float64`                      |
| 500  | `internal_error`          | Unexpected server failure                                       |

`math_domain` and `numeric_overflow` are distinct and must not be
merged.

## 9. HTTP headers and routing behavior

- Responses always set `Content-Type: application/json; charset=utf-8`.
- Responses set `Cache-Control: no-store`.
- `405` responses set `Allow` with the permitted methods.
- Successful calculations do not require, but may include, request-id
  headers if the server task adds them; this is not part of the contract.

## 10. Go domain boundary (`apps/api/internal/calculator`)

- The package is pure arithmetic; it must not import `net/http`,
  `encoding/json`, or any transport concern.
- Public surface, conceptually:
  ```go
  type Operation string

  const (
      OpAdd        Operation = "add"
      OpSubtract   Operation = "subtract"
      OpMultiply   Operation = "multiply"
      OpDivide     Operation = "divide"
      OpPower      Operation = "power"
      OpSqrt       Operation = "sqrt"
      OpPercentage Operation = "percentage"
  )

  func Calculate(op Operation, operands []float64) (float64, error)
  ```
- Errors are classifiable sentinel/typed errors compatible with
  `errors.Is` (e.g., `ErrUnsupportedOperation`, `ErrInvalidOperands`,
  `ErrDivisionByZero`, `ErrMathDomain`, `ErrNumericOverflow`).
- Not permitted: a service struct without state; an interface
  without multiple implementations; an operation plugin registry; a
  dependency-injection container.
- Zero normalization happens here for the returned result and for
  any operands echoed by the HTTP layer (which must call a small
  helper or do the same normalization).

## 11. Go HTTP boundary (`apps/api/internal/httpapi`)

- Owns request decoding, response encoding, status mapping, error
  envelope, and header discipline defined above.
- Wires exactly two handlers: `POST /api/v1/calculations` and
  `GET /healthz`. Unknown paths → `not_found`; wrong methods on
  known paths → `method_not_allowed`.
- Uses `http.MaxBytesReader` at 16 KiB, `json.Decoder` with
  `DisallowUnknownFields`, and a "one value only" check
  (`decoder.More()` after decode must be false).
- Never performs arithmetic; delegates to `internal/calculator`.
- **Owns rendering of every `405 method_not_allowed` response.** The
  Go 1.22 `net/http.ServeMux` emits a `text/plain` body via
  `http.Error` for wrong-method matches, which violates §6.4 and §9.
  The HTTP boundary must therefore intercept or pre-empt that default
  so every `405` carries:
  - `Content-Type: application/json; charset=utf-8`;
  - `Cache-Control: no-store`;
  - `Allow: <permitted method>` (`POST` for `/api/v1/calculations`,
    `GET` for `/healthz`);
  - the standard envelope
    `{"error":{"code":"method_not_allowed","message":"<diagnostic English message>"}}`.
  Acceptable implementations include explicit method dispatch,
  explicit fallback handlers per known path, or a middleware that
  intercepts the mux default. The contract does not prescribe a
  particular technique, but the observable outcome above is mandatory.
  The same discipline covers rendering of `404 not_found`, `413
  payload_too_large`, `415 unsupported_media_type`, and every other
  non-2xx response.

## 12. Server and local-development boundary

### 12.1 Server (`apps/api/cmd/server`)

- Reads `PORT` (default `8080`).
- Composes handlers from `internal/httpapi`.
- Proportional timeouts (read/write/idle), panic recovery, graceful
  shutdown on `SIGINT`/`SIGTERM`, proportional structured logging.
- No CORS middleware in the first release.
- No static frontend serving in the first release. The optional
  full-stack Docker task (T-011) may extend the server to serve
  built static assets; it must not move arithmetic or HTTP-boundary
  behavior into bootstrap code.

### 12.2 Local development

- Default frontend behavior: same-origin `/api` calls.
- Vite dev server proxies `/api` to the Go server.
- `VITE_API_BASE_URL` may override the base at build/dev time.
- Cross-origin deployments are outside this contract.

## 13. Frontend API boundary (`apps/web/src/api/`)

- Exposes a typed calculator API function whose signature and
  serialization match §6 exactly.
- Union types:
  - `Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage'`;
  - error-code union = the exact 12 codes in §8.
- Parses API responses as `unknown` and narrows via hand-written
  runtime checks. Unknown additional response fields are tolerated.
- **Unknown `error.code` fallback.** If a non-2xx response carries an
  `error.code` outside the 12 codes in §8, the narrower falls back to
  a stable local code (`internal_error`) while preserving the
  received string in a `rawCode` field for diagnostic reporting.
  Unknown-code responses are never silently coerced without
  preservation.
- No schema-validation dependency (`zod`, `io-ts`, etc.).
- No client-side arithmetic to verify results.
- Uses `AbortController`. **No automatic retries.** Manual retry is a
  UI concern (§16.3).
- Never throws raw `Response` or raw `Error` at the UI; all failures
  are normalized to typed error objects with a stable kind and, when
  applicable, an `error.code` from §8.

## 14. Physical-calculator interaction contract

The frontend implements a physical-calculator interface, not a form:

- Display area showing the current buffer or last backend result.
- Digit keys `0`–`9`.
- A locale-aware decimal-separator key.
- Binary operators: `+`, `-`, `×`, `÷`, `^` (power), `%` (percentage).
- Unary operator: `√` (square root).
- Sign toggle (`±`).
- `C` — full clear.
- `⌫` — backspace one character from the input buffer.
- `=` — submit atomically to the backend.

Interaction rules:

- Input composition is a **frontend** responsibility. Arithmetic is
  not.
- Pressing `=` sends exactly one request to `/api/v1/calculations`.
- **Binary operator keys never trigger a backend request.** They only
  update pending-operator state. Multi-step expressions such as
  `1 + 2 + 3 =` are entered as two atomic submissions
  (`1 + 2 =` → `+ 3 =`); the frontend never parses or reduces
  compound expressions locally.
- Pressing a binary operator while one is already pending — before any
  digit of the second operand has been entered — **replaces** the
  pending operator. No request is issued.
- The result of a successful request becomes the first operand of the
  next atomic request (chaining). Pressing `√` after a successful
  result seeds that result as the operand of the next unary
  submission.
- **Unary `√` is a top-level operation.** If pressed while a binary
  operator is pending, `√` supersedes it: the second operand entry
  (if any) is discarded and the next `=` submits the unary
  calculation on the visible operand. There is no combined
  "binary-then-unary" submission (for example `1 + 9 √` is not a
  single request).
- **`±` operates on the input buffer only.** It flips a leading `-` on
  the digits being composed. It does not modify a backend-owned
  result; to negate a previous result the user must clear or start a
  new atomic submission (for example `result × -1 =`). This preserves
  the "no client-side arithmetic" rule.
- Free-form expressions, parentheses, precedence parsing, repeated-`=`
  replay, contextual `%` behavior, and history are **out of scope**.
- Square root uses the same equals-driven atomic submission lifecycle
  as binary operations.
- There is no `CE`. `C` covers full clear; `⌫` covers single-character
  correction.

## 15. Keyboard and accessibility behavior

- Digits `0`–`9`, `.` / `,` (locale-aware), `+`, `-`, `*`, `/`, `^`,
  `%`, `Enter`/`=`, `Backspace`, `Delete`/`Escape` (for clear).
- All controls are reachable and operable via keyboard; focus is
  visible and never trapped.
- Buttons expose accessible names via `aria-label` or visible text.
- The result display announces state changes via an appropriate live
  region.
- Localized error messages are announced when they change.
- Errors are identified per WCAG 2.2 error-identification and status.
- User-facing copy comes from `useI18n().t('...')`; no hard-coded
  strings.

## 16. Request lifecycle

### 16.1 Submission

- Exactly one request per `=`. Binary operator keys, `±`, digit keys,
  the decimal key, `⌫`, and `C` never trigger a backend request; only
  `=` (or its keyboard equivalent) does.
- The UI shows a pending state; controls remain operable enough for
  cancellation and clear.
- A local monotonically increasing sequence token is captured with
  each submission.

### 16.2 Success

- The successful `result` replaces the display and becomes the seed
  for chaining.
- Zero normalization from §5.4 is preserved in the UI.

### 16.3 Failure

Failures fall into three retryability classes:

- **Retryable** — network failure and `500 internal_error`. A manual
  Retry affordance is shown. There is no automatic retry.
- **User-fixable** — `422 …` (`unsupported_operation`,
  `invalid_operands`, `division_by_zero`, `math_domain`,
  `numeric_overflow`) and `400 invalid_request`. Shown as a localized
  message keyed by `error.code`. Retry is not offered because the
  inputs must change; the user corrects operands or operation and
  submits again.
- **Non-retryable protocol/configuration** — `400 invalid_json`,
  `404 not_found`, `405 method_not_allowed`, `413 payload_too_large`,
  `415 unsupported_media_type`. These indicate a frontend bug or a
  deployment misconfiguration and cannot be resolved from the
  physical-calculator UI. They are surfaced as a generic
  non-retryable diagnostic ("The request could not be processed.
  Please refresh the app.") without a Retry action; no per-code
  operand-correction affordance is shown.
- Failed submissions preserve the inputs so the user can correct and
  resubmit whenever the failure class permits it.

### 16.4 Cancellation and staleness

- New submissions abort any in-flight superseded submission via
  `AbortController`.
- Responses whose sequence token does not match the newest submission
  are ignored (stale-response suppression).
- Intentionally aborted, superseded requests do not surface a user
  error.
- While a submission is pending, the last successful result remains
  visible and is clearly identified as previous.

## 17. Localization boundary

- Base locale `en-US`, plus `pt-BR` and a pseudo-locale for QA.
- All user-facing strings are looked up via `useI18n().t('...')`.
- The error-code → localized message mapping lives in the frontend
  locale files; the backend `error.message` is diagnostic and is not
  displayed verbatim.
- Numeric formatting uses `Intl.NumberFormat` bound to the active
  locale, subject to §5.5.
- The API vocabulary (`operation`, `operands`, `result`, `error.code`)
  is English and never localized.

## 18. Test-ownership matrix

| Behavior area                                | Owning layer                                      |
| -------------------------------------------- | ------------------------------------------------- |
| Operation arithmetic and edge cases (§4)     | Go `internal/calculator` table tests              |
| Arity, unknown operation, non-finite results | Go domain tests                                   |
| Zero normalization (§5.4)                    | Go domain tests + HTTP tests                      |
| JSON strictness, body size, media type       | Go `internal/httpapi` tests (`httptest`)          |
| Status/headers/`Allow`/`Cache-Control`       | Go HTTP tests                                     |
| Error envelope shape                         | Go HTTP tests + frontend API narrower tests       |
| Frontend request/response types              | Frontend API tests with mocked `fetch`            |
| Frontend runtime narrowing                   | Frontend API tests                                |
| Cancellation and stale-response suppression  | Frontend calculator-state tests                   |
| Physical-calculator state machine (§14–§16)  | Frontend calculator-state tests                   |
| Accessibility and keyboard (§15)             | Frontend behavior tests                           |
| i18n parity (`en-US`, `pt-BR`, pseudo)       | Frontend i18n check + behavior tests              |
| Real-server end-to-end                       | Real-server HTTP smoke test (T-009)               |

## 19. Coverage policy

- Go and frontend workspaces each produce a coverage report; the
  commands are provided in the coverage task.
- No repository-wide numeric coverage threshold is imposed.
- The coverage bar is behavioral: every observable contract behavior
  above must have at least one owning test.

## 20. Security and robustness constraints

- 16 KiB body limit; strict decoding; single JSON value; strict media
  type; `Cache-Control: no-store`; no CORS.
- No PII, no authentication, no persistence.
- Panic recovery in the server. Timeouts proportional to a
  request/response calculator (seconds, not minutes).
- Logs must not include full request bodies at info level. Include
  the operation identifier and error code; exclude operand values from
  info-level logs.

## 21. Docker stance

- Docker packaging is **optional** and post-core.
- If shipped, it is a **single multi-stage full-stack image**: React
  build stage → Go build stage → minimal final image serving both
  `/api/v1/calculations`, `/healthz`, and the built frontend assets
  from one origin.
- No two-service dev-compose topology as the preferred design.
- Compose is permitted only as a thin wrapper over the single image
  when it materially improves developer experience.

## 22. Explicit non-goals

- No client-only arithmetic.
- No duplication of arithmetic between Go and TypeScript.
- No HTTP concerns in `internal/calculator`.
- No cross-language shared package until two real consumers exist.
- No heavyweight monorepo tool.
- No runtime fake REST backend.
- No routing, TanStack Query, auth, onboarding, route transitions,
  Capacitor, or GitHub Pages support.
- No browser automation in the first release.
- No CORS in the first release.
- No hardcoded visual values outside the theme.
- No `any`; use `unknown` and narrow.

## 23. Implementation implications

- **T-002** implements §4, §5, §10 in the Go domain.
- **T-003** implements §6, §7, §8, §9, §11 in the Go HTTP layer.
- **T-004** implements §12.1 in `apps/api/cmd/server`.
- **T-005** implements §13 in `apps/web/src/api/`.
- **T-006** implements §14, §16 as a frontend state model.
- **T-007** implements §15 as the calculator UI.
- **T-008** implements §12.2 for local full-stack development.
- **T-009** implements §18 real-server smoke coverage and §19 coverage
  reporting.
- **T-010** finalizes documentation using this contract as the source.
- **T-011** implements §21 (optional, non-blocking).
- **T-012** is final delivery validation.

Downstream tasks may make small local implementation choices (private
names, file layout inside a package, minor helpers) but must not
reopen decisions frozen here.
