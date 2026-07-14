package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// newRequest builds a POST request against the calculations endpoint with the
// supplied media type and raw body. Passing an empty mediaType intentionally
// omits the Content-Type header (used to exercise the media-type gate).
func newRequest(method, path, mediaType, body string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if mediaType != "" {
		req.Header.Set("Content-Type", mediaType)
	}
	return req
}

// exec runs the handler for a single request and returns the recorder.
func exec(t *testing.T, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rr := httptest.NewRecorder()
	NewHandler().ServeHTTP(rr, req)
	return rr
}

func assertStandardHeaders(t *testing.T, rr *httptest.ResponseRecorder) {
	t.Helper()
	if got := rr.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %q, want application/json; charset=utf-8", got)
	}
	if got := rr.Header().Get("Cache-Control"); got != "no-store" {
		t.Errorf("Cache-Control = %q, want no-store", got)
	}
}

func decodeError(t *testing.T, rr *httptest.ResponseRecorder) ErrorEnvelope {
	t.Helper()
	var env ErrorEnvelope
	if err := json.NewDecoder(rr.Body).Decode(&env); err != nil {
		t.Fatalf("decode error envelope: %v (body=%q)", err, rr.Body.String())
	}
	if env.Error.Message == "" {
		t.Error("error envelope carries an empty message")
	}
	return env
}

func decodeCalculation(t *testing.T, rr *httptest.ResponseRecorder) calculationResponse {
	t.Helper()
	var resp calculationResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode calculation response: %v (body=%q)", err, rr.Body.String())
	}
	return resp
}

// -----------------------------------------------------------------------------
// Routing and method handling
// -----------------------------------------------------------------------------

func TestRouting_UnknownPathsReturnJSON404(t *testing.T) {
	paths := []string{
		"/",
		"/api/v1/unknown",
		"/api/v2/calculations",
		"/api/v1/calculations/extra",
		"/api/v1/calculations/",
		"/healthz/extra",
	}
	for _, p := range paths {
		t.Run(p, func(t *testing.T) {
			rr := exec(t, httptest.NewRequest(http.MethodGet, p, nil))
			if rr.Code != http.StatusNotFound {
				t.Fatalf("status = %d, want 404 (body=%q)", rr.Code, rr.Body.String())
			}
			assertStandardHeaders(t, rr)
			if env := decodeError(t, rr); env.Error.Code != codeNotFound {
				t.Errorf("code = %q, want %q", env.Error.Code, codeNotFound)
			}
		})
	}
}

func TestRouting_MethodNotAllowed(t *testing.T) {
	cases := []struct {
		name, method, path, wantAllow string
	}{
		{"GET calculations", http.MethodGet, pathCalculations, http.MethodPost},
		{"PUT calculations", http.MethodPut, pathCalculations, http.MethodPost},
		{"DELETE calculations", http.MethodDelete, pathCalculations, http.MethodPost},
		{"PATCH calculations", http.MethodPatch, pathCalculations, http.MethodPost},
		{"POST healthz", http.MethodPost, pathHealthz, http.MethodGet},
		{"PUT healthz", http.MethodPut, pathHealthz, http.MethodGet},
		{"DELETE healthz", http.MethodDelete, pathHealthz, http.MethodGet},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := exec(t, httptest.NewRequest(tc.method, tc.path, nil))
			if rr.Code != http.StatusMethodNotAllowed {
				t.Fatalf("status = %d, want 405", rr.Code)
			}
			if got := rr.Header().Get("Allow"); got != tc.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tc.wantAllow)
			}
			assertStandardHeaders(t, rr)
			if env := decodeError(t, rr); env.Error.Code != codeMethodNotAllowed {
				t.Errorf("code = %q, want %q", env.Error.Code, codeMethodNotAllowed)
			}
		})
	}
}

// -----------------------------------------------------------------------------
// Health endpoint
// -----------------------------------------------------------------------------

func TestHealth_Success(t *testing.T) {
	rr := exec(t, httptest.NewRequest(http.MethodGet, pathHealthz, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	assertStandardHeaders(t, rr)
	// Exact body per contract §6.1 (json.Encoder appends a trailing newline).
	if got := rr.Body.String(); got != "{\"status\":\"ok\"}\n" {
		t.Errorf("body = %q, want %q", got, "{\"status\":\"ok\"}\n")
	}
}

// -----------------------------------------------------------------------------
// Content-Type gate
// -----------------------------------------------------------------------------

func TestContentType(t *testing.T) {
	cases := []struct {
		name, mediaType string
		wantStatus      int
		wantCode        string
	}{
		{"missing", "", http.StatusUnsupportedMediaType, codeUnsupportedMediaType},
		{"text/plain", "text/plain", http.StatusUnsupportedMediaType, codeUnsupportedMediaType},
		{"application/xml", "application/xml", http.StatusUnsupportedMediaType, codeUnsupportedMediaType},
		{"application/problem+json", "application/problem+json", http.StatusUnsupportedMediaType, codeUnsupportedMediaType},
		{"malformed", "application/json garbage", http.StatusUnsupportedMediaType, codeUnsupportedMediaType},
		{"plain json", "application/json", http.StatusOK, ""},
		{"json with charset", "application/json; charset=utf-8", http.StatusOK, ""},
		{"json with capitalised type", "Application/JSON", http.StatusOK, ""},
		{"json with quoted charset", `application/json; charset="utf-8"`, http.StatusOK, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body := `{"operation":"add","operands":[1,2]}`
			rr := exec(t, newRequest(http.MethodPost, pathCalculations, tc.mediaType, body))
			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body=%q)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			assertStandardHeaders(t, rr)
			if tc.wantCode != "" {
				if env := decodeError(t, rr); env.Error.Code != tc.wantCode {
					t.Errorf("code = %q, want %q", env.Error.Code, tc.wantCode)
				}
			}
		})
	}
}

// -----------------------------------------------------------------------------
// Body-size gate
// -----------------------------------------------------------------------------

func TestBodySize_ExactBoundaryIsAccepted(t *testing.T) {
	// Construct a body of exactly maxRequestBytes (16384). Padding lives
	// inside an unused position that we later reject via unknown-field
	// detection would defeat the test, so we pad with whitespace, which
	// is legal inside a JSON value.
	base := `{"operation":"add","operands":[1,2]}`
	padding := int(maxRequestBytes) - len(base)
	if padding < 0 {
		t.Fatalf("base longer than boundary: %d", len(base))
	}
	// A JSON value permits arbitrary whitespace before the value; that is
	// the simplest form of padding that stays inside the boundary.
	body := strings.Repeat(" ", padding) + base
	if int64(len(body)) != maxRequestBytes {
		t.Fatalf("body length %d, want %d", len(body), maxRequestBytes)
	}

	rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
	}
}

func TestBodySize_OverBoundaryRejects(t *testing.T) {
	// Exactly one byte over the boundary — MaxBytesReader rejects the read
	// that crosses the limit.
	body := strings.Repeat(" ", int(maxRequestBytes)) + `{"operation":"add","operands":[1,2]}`
	rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413 (body=%q)", rr.Code, rr.Body.String())
	}
	if env := decodeError(t, rr); env.Error.Code != codePayloadTooLarge {
		t.Errorf("code = %q, want %q", env.Error.Code, codePayloadTooLarge)
	}
}

// -----------------------------------------------------------------------------
// JSON pipeline (syntax, shape, unknown fields, trailing values)
// -----------------------------------------------------------------------------

func TestDecode_InvalidJSON(t *testing.T) {
	cases := []struct {
		name, body string
	}{
		{"empty", ""},
		{"whitespace only", "   \n\t "},
		{"truncated object", `{"operation":"add","operands":[1,2]`},
		{"literal NaN", `{"operation":"add","operands":[NaN,1]}`},
		{"literal Infinity", `{"operation":"add","operands":[Infinity,1]}`},
		{"literal -Infinity", `{"operation":"add","operands":[-Infinity,1]}`},
		{"malformed string escape", `{"operation":"add\q","operands":[1,2]}`},
		{"trailing object", `{"operation":"add","operands":[1,2]} {}`},
		{"trailing literal", `{"operation":"add","operands":[1,2]} true`},
		{"trailing garbage", `{"operation":"add","operands":[1,2]} garbage`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", tc.body))
			if rr.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (body=%q)", rr.Code, rr.Body.String())
			}
			if env := decodeError(t, rr); env.Error.Code != codeInvalidJSON {
				t.Errorf("code = %q, want %q", env.Error.Code, codeInvalidJSON)
			}
		})
	}
}

func TestDecode_InvalidRequest(t *testing.T) {
	cases := []struct {
		name, body string
	}{
		{"empty object", `{}`},
		{"missing operation", `{"operands":[1,2]}`},
		{"missing operands", `{"operation":"add"}`},
		{"top-level null", `null`},
		{"top-level array", `[1,2,3]`},
		{"top-level string", `"hello"`},
		{"top-level number", `42`},
		{"top-level boolean", `true`},
		{"wrong operation type", `{"operation":123,"operands":[1,2]}`},
		{"wrong operands type", `{"operation":"add","operands":"nope"}`},
		{"string operand", `{"operation":"add","operands":["1",2]}`},
		{"null operand", `{"operation":"add","operands":[null,2]}`},
		{"boolean operand", `{"operation":"add","operands":[true,2]}`},
		{"object operand", `{"operation":"add","operands":[{},2]}`},
		{"stringified NaN", `{"operation":"add","operands":["NaN",1]}`},
		{"stringified Infinity", `{"operation":"add","operands":["Infinity",1]}`},
		{"unknown field", `{"operation":"add","operands":[1,2],"extra":true}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", tc.body))
			if rr.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (body=%q)", rr.Code, rr.Body.String())
			}
			if env := decodeError(t, rr); env.Error.Code != codeInvalidRequest {
				t.Errorf("code = %q, want %q", env.Error.Code, codeInvalidRequest)
			}
		})
	}
}

// TestDuplicateKeys pins Go's standard encoding/json behavior: last value wins.
// Contract §7 rule 6 accepts this explicitly.
func TestDuplicateKeys(t *testing.T) {
	t.Run("duplicate operation", func(t *testing.T) {
		body := `{"operation":"add","operation":"multiply","operands":[2,3]}`
		rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
		}
		resp := decodeCalculation(t, rr)
		if resp.Operation != "multiply" || resp.Result != 6 {
			t.Errorf("got operation=%q result=%v, want multiply/6", resp.Operation, resp.Result)
		}
	})
	t.Run("duplicate operands", func(t *testing.T) {
		body := `{"operation":"add","operands":[1,2],"operands":[10,20]}`
		rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
		}
		resp := decodeCalculation(t, rr)
		if resp.Result != 30 || len(resp.Operands) != 2 || resp.Operands[0] != 10 || resp.Operands[1] != 20 {
			t.Errorf("got operands=%v result=%v, want [10 20]/30", resp.Operands, resp.Result)
		}
	})
}

// -----------------------------------------------------------------------------
// Domain error mapping
// -----------------------------------------------------------------------------

func TestDomainErrors(t *testing.T) {
	cases := []struct {
		name, body string
		wantCode   string
	}{
		{"unsupported operation", `{"operation":"foo","operands":[1,2]}`, codeUnsupportedOperation},
		{"arity mismatch (add unary)", `{"operation":"add","operands":[1]}`, codeInvalidOperands},
		{"arity mismatch (sqrt binary)", `{"operation":"sqrt","operands":[1,2]}`, codeInvalidOperands},
		{"empty operands", `{"operation":"add","operands":[]}`, codeInvalidOperands},
		{"division by zero", `{"operation":"divide","operands":[1,0]}`, codeDivisionByZero},
		{"division by negative zero", `{"operation":"divide","operands":[1,-0]}`, codeDivisionByZero},
		{"sqrt negative", `{"operation":"sqrt","operands":[-1]}`, codeMathDomain},
		{"power domain", `{"operation":"power","operands":[-2,0.5]}`, codeMathDomain},
		{"power zero neg exponent", `{"operation":"power","operands":[0,-1]}`, codeMathDomain},
		{"numeric overflow (power)", `{"operation":"power","operands":[10,1000]}`, codeNumericOverflow},
		{"numeric overflow (multiply)", `{"operation":"multiply","operands":[1e200,1e200]}`, codeNumericOverflow},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", tc.body))
			if rr.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status = %d, want 422 (body=%q)", rr.Code, rr.Body.String())
			}
			if env := decodeError(t, rr); env.Error.Code != tc.wantCode {
				t.Errorf("code = %q, want %q", env.Error.Code, tc.wantCode)
			}
		})
	}
}

// -----------------------------------------------------------------------------
// Success responses
// -----------------------------------------------------------------------------

func TestSuccess(t *testing.T) {
	cases := []struct {
		name         string
		body         string
		wantOp       string
		wantOperands []float64
		wantResult   float64
	}{
		{"add", `{"operation":"add","operands":[1,2]}`, "add", []float64{1, 2}, 3},
		{"divide", `{"operation":"divide","operands":[10,4]}`, "divide", []float64{10, 4}, 2.5},
		{"sqrt", `{"operation":"sqrt","operands":[9]}`, "sqrt", []float64{9}, 3},
		{"percentage", `{"operation":"percentage","operands":[200,15]}`, "percentage", []float64{200, 15}, 30},
		{"power", `{"operation":"power","operands":[2,3]}`, "power", []float64{2, 3}, 8},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", tc.body))
			if rr.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
			}
			assertStandardHeaders(t, rr)
			resp := decodeCalculation(t, rr)
			if resp.Operation != tc.wantOp {
				t.Errorf("operation = %q, want %q", resp.Operation, tc.wantOp)
			}
			if len(resp.Operands) != len(tc.wantOperands) {
				t.Fatalf("operands length = %d, want %d", len(resp.Operands), len(tc.wantOperands))
			}
			for i, want := range tc.wantOperands {
				if resp.Operands[i] != want {
					t.Errorf("operands[%d] = %v, want %v", i, resp.Operands[i], want)
				}
			}
			if resp.Result != tc.wantResult {
				t.Errorf("result = %v, want %v", resp.Result, tc.wantResult)
			}
		})
	}
}

// TestNegativeZeroNormalization verifies the contract §5.4 requirement using
// math.Signbit on the decoded floats. Go's encoding/json preserves the sign
// of zero across marshal/unmarshal, so a failure to normalize is observable
// as Signbit(operand) == true after decoding.
func TestNegativeZeroNormalization(t *testing.T) {
	body := `{"operation":"add","operands":[-0,0]}`
	rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
	}

	raw := rr.Body.String()
	if strings.Contains(raw, "-0") {
		t.Errorf("response body contains negative zero: %s", raw)
	}

	resp := decodeCalculation(t, rr)
	for i, v := range resp.Operands {
		if math.Signbit(v) {
			t.Errorf("operands[%d] retained negative sign of zero", i)
		}
	}
	if math.Signbit(resp.Result) {
		t.Error("result retained negative sign of zero")
	}
}

// -----------------------------------------------------------------------------
// Robustness: partial body, concurrent handler use
// -----------------------------------------------------------------------------

// TestPartialBody feeds a reader that yields a truncated JSON prefix before
// erroring. The handler must classify the failure without panicking.
func TestPartialBody(t *testing.T) {
	pr, pw := io.Pipe()
	go func() {
		_, _ = pw.Write([]byte(`{"operation":"add","operands":[1`))
		_ = pw.CloseWithError(fmt.Errorf("simulated network failure"))
	}()

	req := httptest.NewRequest(http.MethodPost, pathCalculations, pr)
	req.Header.Set("Content-Type", "application/json")
	rr := exec(t, req)

	if rr.Code == http.StatusOK {
		t.Fatalf("status = 200, want an error status (body=%q)", rr.Body.String())
	}
	assertStandardHeaders(t, rr)
	// The exact code depends on where the reader errored; it must still be
	// a well-formed envelope with a known code.
	env := decodeError(t, rr)
	if _, ok := statusForCode[env.Error.Code]; !ok {
		t.Errorf("unknown error code in envelope: %q", env.Error.Code)
	}
}

// TestConcurrentHandlerUse verifies the handler is safe for concurrent use.
// Run under `go test -race` to catch data races.
func TestConcurrentHandlerUse(t *testing.T) {
	handler := NewHandler()
	const workers = 32
	const iterations = 20

	var wg sync.WaitGroup
	wg.Add(workers)
	for w := 0; w < workers; w++ {
		go func() {
			defer wg.Done()
			for i := 0; i < iterations; i++ {
				req := httptest.NewRequest(http.MethodPost, pathCalculations,
					strings.NewReader(`{"operation":"add","operands":[1,2]}`))
				req.Header.Set("Content-Type", "application/json")
				rr := httptest.NewRecorder()
				handler.ServeHTTP(rr, req)
				if rr.Code != http.StatusOK {
					t.Errorf("concurrent request failed: %d", rr.Code)
					return
				}
			}
		}()
	}
	wg.Wait()
}

// -----------------------------------------------------------------------------
// Fuzz safety net (small, in-package, no external inputs)
// -----------------------------------------------------------------------------

// FuzzCalculationsHandler exercises the decode boundary with arbitrary bodies
// and confirms the handler never panics and always emits a known error code
// with the standard header discipline.
func FuzzCalculationsHandler(f *testing.F) {
	seeds := []string{
		"",
		"{}",
		`{"operation":"add","operands":[1,2]}`,
		`{"operation":"foo","operands":[1]}`,
		`{"operation":"divide","operands":[1,0]}`,
		`{"operation":"add","operands":[NaN]}`,
	}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, body string) {
		rr := exec(t, newRequest(http.MethodPost, pathCalculations, "application/json", body))
		if rr.Header().Get("Content-Type") != "application/json; charset=utf-8" {
			t.Errorf("missing content type for body=%q", body)
		}
		if rr.Code >= 400 {
			var env ErrorEnvelope
			if err := json.NewDecoder(rr.Body).Decode(&env); err != nil {
				t.Errorf("non-JSON error envelope for body=%q: %v", body, err)
				return
			}
			if _, ok := statusForCode[env.Error.Code]; !ok {
				t.Errorf("unknown error code %q for body=%q", env.Error.Code, body)
			}
		}
	})
}
