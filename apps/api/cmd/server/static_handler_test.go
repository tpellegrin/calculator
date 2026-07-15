package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWithStaticServing(t *testing.T) {
	// mockApiHandler returns 404 for anything not /api or /healthz to simulate real handler behavior.
	mockApiHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
			return
		}
		if r.URL.Path == "/api/v1/calculations" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"result":3}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":{"code":"not_found","message":"Resource not found."}}`))
	})

	t.Run("static serving disabled", func(t *testing.T) {
		handler, err := withStaticServing(mockApiHandler, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", rr.Code)
		}
	})

	t.Run("static root", func(t *testing.T) {
		tmpDir := t.TempDir()
		indexContent := "<html><body>Hello World</body></html>"
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte(indexContent), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
		if body := rr.Body.String(); !strings.Contains(body, indexContent) {
			t.Errorf("expected body to contain %q, got %q", indexContent, body)
		}
	})

	t.Run("existing static asset", func(t *testing.T) {
		tmpDir := t.TempDir()
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}
		assetContent := "console.log('test')"
		if err := os.Mkdir(filepath.Join(tmpDir, "assets"), 0755); err != nil {
			t.Fatalf("failed to create assets dir: %v", err)
		}
		if err := os.WriteFile(filepath.Join(tmpDir, "assets", "test.js"), []byte(assetContent), 0644); err != nil {
			t.Fatalf("failed to create test.js: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/assets/test.js", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
		if body := rr.Body.String(); body != assetContent {
			t.Errorf("expected body %q, got %q", assetContent, body)
		}
	})

	t.Run("api preservation", func(t *testing.T) {
		tmpDir := t.TempDir()
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodPost, "/api/v1/calculations", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
		if !strings.Contains(rr.Body.String(), `"result":3`) {
			t.Errorf("expected api response, got %q", rr.Body.String())
		}
	})

	t.Run("health preservation", func(t *testing.T) {
		tmpDir := t.TempDir()
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
		if rr.Body.String() != `{"status":"ok"}` {
			t.Errorf("expected health response, got %q", rr.Body.String())
		}
	})

	t.Run("api unknown route", func(t *testing.T) {
		tmpDir := t.TempDir()
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/api/nonexistent", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", rr.Code)
		}
		if !strings.Contains(rr.Body.String(), `"not_found"`) {
			t.Errorf("expected api json error, got %q", rr.Body.String())
		}
	})

	t.Run("SPA fallback", func(t *testing.T) {
		tmpDir := t.TempDir()
		indexContent := "<html><body>Index</body></html>"
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte(indexContent), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/some/frontend/route", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
		if rr.Body.String() != indexContent {
			t.Errorf("expected index content, got %q", rr.Body.String())
		}
	})

	t.Run("invalid static directory", func(t *testing.T) {
		_, err := withStaticServing(mockApiHandler, "/nonexistent/path/at/least/hope/so")
		if err == nil {
			t.Error("expected error for nonexistent directory, got nil")
		}

		tmpFile := filepath.Join(t.TempDir(), "not-a-dir")
		if err := os.WriteFile(tmpFile, []byte("test"), 0644); err != nil {
			t.Fatalf("failed to create temp file: %v", err)
		}
		_, err = withStaticServing(mockApiHandler, tmpFile)
		if err == nil {
			t.Error("expected error for file instead of directory, got nil")
		}

		emptyDir := t.TempDir()
		_, err = withStaticServing(mockApiHandler, emptyDir)
		if err == nil {
			t.Error("expected error for directory without index.html, got nil")
		}
	})

	t.Run("non-GET behavior", func(t *testing.T) {
		tmpDir := t.TempDir()
		if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
			t.Fatalf("failed to create index.html: %v", err)
		}

		handler, err := withStaticServing(mockApiHandler, tmpDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		req := httptest.NewRequest(http.MethodPost, "/some/random/path", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected 404 from apiHandler, got %d", rr.Code)
		}
	})
}

func TestWithStaticServing_PathTraversal(t *testing.T) {
	tmpDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("index"), 0644); err != nil {
		t.Fatalf("failed to create index.html: %v", err)
	}

	secretFile := filepath.Join(os.TempDir(), "secret.txt")
	if err := os.WriteFile(secretFile, []byte("sensitive"), 0644); err != nil {
		t.Fatalf("failed to create secret file: %v", err)
	}
	defer os.Remove(secretFile)

	handler, err := withStaticServing(http.NotFoundHandler(), tmpDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Try to access the secret file via path traversal
	// http.FileServer and http.Dir should handle this correctly.
	req := httptest.NewRequest(http.MethodGet, "/../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../tmp/secret.txt", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// It should either be redirected (cleansed) or serve index.html (fallback)
	// http.FileServer usually redirects for /../
	if strings.Contains(rr.Body.String(), "sensitive") {
		t.Errorf("sensitive data leaked!")
	}
}
