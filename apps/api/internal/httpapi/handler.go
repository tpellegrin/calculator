package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"strings"

	"calculator/apps/api/internal/calculator"
)

const (
	// maxRequestBytes is the strict body-size ceiling for calculation requests,
	// enforced via http.MaxBytesReader (contract §7 rule 3).
	maxRequestBytes int64 = 16 << 10 // 16 KiB

	pathCalculations = "/api/v1/calculations"
	pathHealthz      = "/healthz"

	mediaTypeJSON = "application/json"
)

// calculationRequest is the internal decode DTO. Pointer fields let the handler
// distinguish absent JSON members from present zero values, and the element
// pointer type surfaces JSON `null` operands as nil so they can be rejected as
// wrong-typed request representations (contract §7 rule 8).
type calculationRequest struct {
	Operation *string     `json:"operation"`
	Operands  *[]*float64 `json:"operands"`
}

// calculationResponse is the wire shape returned on a successful calculation.
type calculationResponse struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}

// healthResponse is the wire shape of the health endpoint.
type healthResponse struct {
	Status string `json:"status"`
}

// NewHandler returns the http.Handler that owns every route defined by the
// calculator contract. The returned handler is safe for concurrent use and
// carries no mutable state.
func NewHandler() http.Handler {
	return http.HandlerFunc(route)
}

// route performs explicit path and method dispatch so the boundary owns the
// body of every non-2xx response (contract §11).
func route(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case pathCalculations:
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, codeMethodNotAllowed, "Method not allowed. Use POST.")
			return
		}
		handleCalculations(w, r)
	case pathHealthz:
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeError(w, codeMethodNotAllowed, "Method not allowed. Use GET.")
			return
		}
		handleHealthz(w, r)
	default:
		writeError(w, codeNotFound, "Resource not found.")
	}
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

func handleCalculations(w http.ResponseWriter, r *http.Request) {
	// Body-size gate: MaxBytesReader wraps the body and returns
	// *http.MaxBytesError on the first read that crosses the ceiling.
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)

	// Media-type gate: mime.ParseMediaType handles parameters and casing.
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != mediaTypeJSON {
		writeError(w, codeUnsupportedMediaType, "Unsupported media type. Use application/json.")
		return
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	var req calculationRequest
	if err := dec.Decode(&req); err != nil {
		classifyDecodeError(w, err)
		return
	}

	// Single-value gate: any further token (including another JSON value or
	// stray garbage) makes the body invalid JSON per contract §7 rule 4.
	var trailing json.RawMessage
	if err := dec.Decode(&trailing); !errors.Is(err, io.EOF) {
		writeError(w, codeInvalidJSON, "Request body must contain exactly one JSON value.")
		return
	}

	// Representation check: required members must be present after decoding.
	if req.Operation == nil || req.Operands == nil {
		writeError(w, codeInvalidRequest, "Missing required fields: operation and operands.")
		return
	}

	op := calculator.Operation(*req.Operation)

	// Reject a JSON `null` element up front: encoding/json would otherwise
	// zero it silently, which would violate contract §7 rule 8.
	rawOperands := *req.Operands
	operands := make([]float64, len(rawOperands))
	for i, p := range rawOperands {
		if p == nil {
			writeError(w, codeInvalidRequest, "Operand values must be finite JSON numbers.")
			return
		}
		operands[i] = *p
	}

	result, err := calculator.Calculate(op, operands)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	echoed := make([]float64, len(operands))
	for i, v := range operands {
		echoed[i] = calculator.NormalizeZero(v)
	}

	writeJSON(w, http.StatusOK, calculationResponse{
		Operation: string(op),
		Operands:  echoed,
		Result:    result,
	})
}

// classifyDecodeError converts a decode-time error into the appropriate
// project-owned error response.
func classifyDecodeError(w http.ResponseWriter, err error) {
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		writeError(w, codePayloadTooLarge, "Request payload exceeds the 16 KiB limit.")
		return
	}

	// Contract §7 rule 8: a wrong operand element type surfaces as a
	// *json.UnmarshalTypeError and maps to invalid_request. This includes
	// stringified non-finite values such as "NaN" or "Infinity".
	var unmarshalTypeErr *json.UnmarshalTypeError
	if errors.As(err, &unmarshalTypeErr) {
		writeError(w, codeInvalidRequest, "Request body does not match the expected schema.")
		return
	}

	// The encoding/json package does not expose a typed error for unknown
	// fields; the message prefix is stable across Go releases and is the
	// documented way to detect this condition.
	if strings.HasPrefix(err.Error(), "json: unknown field") {
		writeError(w, codeInvalidRequest, err.Error())
		return
	}

	// Contract §7 rule 7 and T-003 required-behavior line for empty body:
	// any malformed / truncated body, including the empty-body case that
	// surfaces as io.EOF on first decode, maps to invalid_json.
	writeError(w, codeInvalidJSON, "Request body is not a valid JSON value.")
	_ = err // retained for potential future logging; not exposed in the response
}

// writeDomainError maps calculator sentinel errors to the contract's stable
// error vocabulary via errors.Is; unknown errors surface as internal_error.
func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, calculator.ErrUnsupportedOperation):
		writeError(w, codeUnsupportedOperation, "The requested operation is not supported.")
	case errors.Is(err, calculator.ErrInvalidOperands):
		writeError(w, codeInvalidOperands, "The provided operands are invalid for the requested operation.")
	case errors.Is(err, calculator.ErrDivisionByZero):
		writeError(w, codeDivisionByZero, "Division by zero is not allowed.")
	case errors.Is(err, calculator.ErrMathDomain):
		writeError(w, codeMathDomain, "The operation is undefined for the provided operands.")
	case errors.Is(err, calculator.ErrNumericOverflow):
		writeError(w, codeNumericOverflow, "The result exceeds the representable numeric range.")
	default:
		writeError(w, codeInternalError, "An unexpected internal error occurred.")
	}
}
