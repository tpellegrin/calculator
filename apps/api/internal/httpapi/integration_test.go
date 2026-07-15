//go:build integration
// +build integration

package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"calculator/apps/api/internal/httpapi"
)

func TestIntegration(t *testing.T) {
	handler := httpapi.NewHandler()
	ts := httptest.NewServer(handler)
	defer ts.Close()

	client := ts.Client()

	t.Run("Health", func(t *testing.T) {
		resp, err := client.Get(ts.URL + "/healthz")
		if err != nil {
			t.Fatalf("GET /healthz failed: %v", err)
		}
		defer resp.Body.Close()

		assertCommonErrorHeaders(t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.StatusCode)
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("failed to read body: %v", err)
		}

		expected := `{"status":"ok"}` + "\n"
		if string(body) != expected {
			t.Errorf("expected body %q, got %q", expected, string(body))
		}
	})

	t.Run("Divide success", func(t *testing.T) {
		reqBody := `{"operation":"divide","operands":[10,4]}`
		resp, err := client.Post(ts.URL+"/api/v1/calculations", "application/json", bytes.NewBufferString(reqBody))
		if err != nil {
			t.Fatalf("POST /api/v1/calculations failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.StatusCode)
		}

		var data struct {
			Operation string    `json:"operation"`
			Operands  []float64 `json:"operands"`
			Result    float64   `json:"result"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if data.Result != 2.5 {
			t.Errorf("expected result 2.5, got %f", data.Result)
		}
	})

	t.Run("Division by zero", func(t *testing.T) {
		reqBody := `{"operation":"divide","operands":[1,0]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusUnprocessableEntity, "division_by_zero")
	})

	t.Run("Invalid JSON (literal NaN)", func(t *testing.T) {
		// Literal NaN is invalid JSON per RFC 8259
		reqBody := `{"operation":"add","operands":[NaN,1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusBadRequest, "invalid_json")
	})

	t.Run("Invalid request (wrong type)", func(t *testing.T) {
		reqBody := `{"operation":"add","operands":["NaN",1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusBadRequest, "invalid_request")
	})

	t.Run("Unsupported operation", func(t *testing.T) {
		reqBody := `{"operation":"mod","operands":[1,1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusUnprocessableEntity, "unsupported_operation")
	})

	t.Run("Invalid operands (arity)", func(t *testing.T) {
		reqBody := `{"operation":"add","operands":[1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusUnprocessableEntity, "invalid_operands")
	})

	t.Run("Math domain", func(t *testing.T) {
		reqBody := `{"operation":"sqrt","operands":[-1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusUnprocessableEntity, "math_domain")
	})

	t.Run("Numeric overflow", func(t *testing.T) {
		reqBody := `{"operation":"multiply","operands":[1e300,1e300]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", reqBody, http.StatusUnprocessableEntity, "numeric_overflow")
	})

	t.Run("Payload too large", func(t *testing.T) {
		// Limit is 16 KiB = 16384 bytes
		largeBody := `{"operation":"add","operands":[1,1],"padding":"` + strings.Repeat("a", 17000) + `"}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "application/json", largeBody, http.StatusRequestEntityTooLarge, "payload_too_large")
	})

	t.Run("Unsupported media type", func(t *testing.T) {
		reqBody := `{"operation":"add","operands":[1,1]}`
		assertError(t, client, "POST", ts.URL+"/api/v1/calculations", "text/plain", reqBody, http.StatusUnsupportedMediaType, "unsupported_media_type")
	})

	t.Run("Method not allowed", func(t *testing.T) {
		resp := assertError(t, client, "GET", ts.URL+"/api/v1/calculations", "application/json", "", http.StatusMethodNotAllowed, "method_not_allowed")
		if allow := resp.Header.Get("Allow"); allow != "POST" {
			t.Errorf("expected Allow: POST, got %q", allow)
		}
	})

	t.Run("Not found", func(t *testing.T) {
		assertError(t, client, "GET", ts.URL+"/unknown", "application/json", "", http.StatusNotFound, "not_found")
	})
}

func assertError(t *testing.T, client *http.Client, method, url, contentType, body string, expectedStatus int, expectedCode string) *http.Response {
	t.Helper()

	var reqBody io.Reader
	if body != "" {
		reqBody = strings.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s failed: %v", method, url, err)
	}
	defer resp.Body.Close()

	assertCommonErrorHeaders(t, resp)

	if resp.StatusCode != expectedStatus {
		t.Errorf("expected status %d, got %d", expectedStatus, resp.StatusCode)
	}

	var env httpapi.ErrorEnvelope
	if err := json.NewDecoder(resp.Body).Decode(&env); err != nil {
		t.Fatalf("failed to decode error envelope: %v", err)
	}

	if env.Error.Code != expectedCode {
		t.Errorf("expected error code %q, got %q", expectedCode, env.Error.Code)
	}

	return resp
}

func assertCommonErrorHeaders(t *testing.T, resp *http.Response) {
	t.Helper()

	ctype := resp.Header.Get("Content-Type")
	expectedCtype := "application/json; charset=utf-8"
	if ctype != expectedCtype {
		t.Errorf("expected Content-Type %q, got %q", expectedCtype, ctype)
	}

	cache := resp.Header.Get("Cache-Control")
	expectedCache := "no-store"
	if cache != expectedCache {
		t.Errorf("expected Cache-Control %q, got %q", expectedCache, cache)
	}
}
