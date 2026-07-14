package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
)

// ErrorEnvelope is the project-owned JSON error envelope defined by
// calculator-contract §6.4. It is exported so that in-package tests (and any
// future integration harness inside apps/api) can decode responses without
// duplicating the shape.
type ErrorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// Stable error codes from calculator-contract §8. These strings are the
// wire-visible identifiers consumed by the frontend narrower.
const (
	codeInvalidJSON          = "invalid_json"
	codeInvalidRequest       = "invalid_request"
	codeNotFound             = "not_found"
	codeMethodNotAllowed     = "method_not_allowed"
	codePayloadTooLarge      = "payload_too_large"
	codeUnsupportedMediaType = "unsupported_media_type"
	codeUnsupportedOperation = "unsupported_operation"
	codeInvalidOperands      = "invalid_operands"
	codeDivisionByZero       = "division_by_zero"
	codeMathDomain           = "math_domain"
	codeNumericOverflow      = "numeric_overflow"
	codeInternalError        = "internal_error"
)

// statusForCode maps every stable error code to its HTTP status. It is
// initialized once and treated as read-only, so it is safe for concurrent use.
var statusForCode = map[string]int{
	codeInvalidJSON:          http.StatusBadRequest,
	codeInvalidRequest:       http.StatusBadRequest,
	codeNotFound:             http.StatusNotFound,
	codeMethodNotAllowed:     http.StatusMethodNotAllowed,
	codePayloadTooLarge:      http.StatusRequestEntityTooLarge,
	codeUnsupportedMediaType: http.StatusUnsupportedMediaType,
	codeUnsupportedOperation: http.StatusUnprocessableEntity,
	codeInvalidOperands:      http.StatusUnprocessableEntity,
	codeDivisionByZero:       http.StatusUnprocessableEntity,
	codeMathDomain:           http.StatusUnprocessableEntity,
	codeNumericOverflow:      http.StatusUnprocessableEntity,
	codeInternalError:        http.StatusInternalServerError,
}

// writeError renders the project error envelope with the correct status and
// header discipline. Unknown codes fall back to internal_error / 500 rather
// than silently emitting an inconsistent response.
func writeError(w http.ResponseWriter, code, message string) {
	status, ok := statusForCode[code]
	if !ok {
		status = http.StatusInternalServerError
		code = codeInternalError
	}

	var env ErrorEnvelope
	env.Error.Code = code
	env.Error.Message = message
	writeJSON(w, status, env)
}

// fallbackInternalErrorBody is a pre-serialized envelope used only if the
// primary JSON encoding fails. Every DTO written by this package is
// statically shaped, so that branch is practically unreachable; the
// hard-coded envelope keeps the boundary self-consistent if it ever runs.
var fallbackInternalErrorBody = []byte(`{"error":{"code":"internal_error","message":"An unexpected internal error occurred."}}` + "\n")

// writeJSON serializes the payload to an in-memory buffer before writing so
// that a late encoding failure cannot produce a response with contradictory
// headers or a partially-written body. Every owned response carries
// Content-Type and Cache-Control per contract §9.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write(fallbackInternalErrorBody)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_, _ = w.Write(buf.Bytes())
}
