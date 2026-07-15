package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"calculator/apps/api/internal/httpapi"
)

func TestLoadConfig(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		env     map[string]string
		want    string
		wantErr bool
	}{
		{"missing PORT defaults to 8080", nil, "8080", false},
		{"custom valid port", map[string]string{"PORT": "9090"}, "9090", false},
		{"blank PORT defaults to 8080", map[string]string{"PORT": ""}, "8080", false},
		{"non-numeric is rejected", map[string]string{"PORT": "abc"}, "", true},
		{"whitespace is rejected", map[string]string{"PORT": " 80 "}, "", true},
		{"negative is rejected", map[string]string{"PORT": "-1"}, "", true},
		{"above 65535 is rejected", map[string]string{"PORT": "70000"}, "", true},
		{"host:port form is rejected", map[string]string{"PORT": "localhost:8080"}, "", true},
		{"zero is accepted for ephemeral bind", map[string]string{"PORT": "0"}, "0", false},
		{"upper bound is accepted", map[string]string{"PORT": "65535"}, "65535", false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			getenv := func(key string) string {
				if tt.env == nil {
					return ""
				}
				return tt.env[key]
			}

			cfg, err := loadConfig(getenv)
			if (err != nil) != tt.wantErr {
				t.Fatalf("loadConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && cfg.Port != tt.want {
				t.Errorf("loadConfig() port = %q, want %q", cfg.Port, tt.want)
			}
		})
	}
}

// TestRun_ConfigError verifies that a config failure returns immediately
// without opening a listener.
func TestRun_ConfigError(t *testing.T) {
	t.Parallel()

	getenv := func(string) string { return "not-a-port" }

	err := Run(context.Background(), io.Discard, io.Discard, getenv)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "config") {
		t.Errorf("error should be wrapped with 'config': %v", err)
	}
}

// TestRunWithListener_GracefulShutdownOnCancel drives the full lifecycle
// against an ephemeral listener and verifies handler wiring via /healthz,
// then triggers graceful shutdown by cancelling the parent context.
func TestRunWithListener_GracefulShutdownOnCancel(t *testing.T) {
	t.Parallel()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	// Ownership transfers to runWithListener; do not close ln here.

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- runWithListener(ctx, io.Discard, ln, "")
	}()

	url := "http://" + ln.Addr().String() + "/healthz"
	client := &http.Client{Timeout: 2 * time.Second}

	// The serve goroutine starts asynchronously; retry briefly on
	// connection refused rather than sleeping unconditionally.
	var resp *http.Response
	deadline := time.Now().Add(2 * time.Second)
	for {
		resp, err = client.Get(url)
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("GET /healthz never succeeded: %v", err)
		}
		time.Sleep(10 * time.Millisecond)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("healthz status = %d, want 200", resp.StatusCode)
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode healthz: %v", err)
	}
	_ = resp.Body.Close()
	if body.Status != "ok" {
		t.Errorf("healthz status field = %q, want %q", body.Status, "ok")
	}

	// Trigger graceful shutdown via cancellation (the signal-context
	// equivalent used by Run). Bounded wait for the lifecycle to
	// complete; a hang here would indicate a goroutine or listener leak.
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Errorf("runWithListener returned error: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("runWithListener did not return after cancellation")
	}
}

// TestRunWithListener_ServeErrorClosesLifecycle verifies that if Serve
// returns an unexpected error (here, by closing the listener out from
// under it), runWithListener terminates deterministically and reports
// the error without waiting for a signal.
func TestRunWithListener_ServeErrorClosesLifecycle(t *testing.T) {
	t.Parallel()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	ctx := context.Background()
	done := make(chan error, 1)
	go func() {
		done <- runWithListener(ctx, io.Discard, ln, "")
	}()

	// Close the underlying listener to force Serve to return a
	// non-ErrServerClosed error.
	// Small delay so serve goroutine reaches Accept first; then poll on
	// the done channel with a bounded timeout.
	time.Sleep(20 * time.Millisecond)
	_ = ln.Close()

	select {
	case err := <-done:
		if err == nil {
			// It is legal for Serve to return ErrServerClosed on some
			// paths (mapped to nil). If so, at least ensure no goroutine
			// leaked.
			return
		}
		if !strings.Contains(err.Error(), "serve") {
			t.Errorf("error should be wrapped with 'serve': %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("runWithListener did not return after listener close")
	}
}

// TestRunWithListener_PreCancelledContext verifies the shutdown path
// when the caller's context is already cancelled before serving begins:
// Run must not deadlock and must return within the shutdown budget.
func TestRunWithListener_PreCancelledContext(t *testing.T) {
	t.Parallel()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before starting

	done := make(chan error, 1)
	go func() {
		done <- runWithListener(ctx, io.Discard, ln, "")
	}()

	select {
	case err := <-done:
		if err != nil {
			t.Errorf("expected clean shutdown, got %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("runWithListener did not return under pre-cancelled context")
	}
}

func TestRecoveryMiddleware_PanicsProduceInternalErrorEnvelope(t *testing.T) {
	t.Parallel()

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})

	srv := httptest.NewServer(recoveryMiddleware(logger, handler))
	defer srv.Close()

	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", resp.StatusCode)
	}
	if got := resp.Header.Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %q, want application/json; charset=utf-8", got)
	}

	var env httpapi.ErrorEnvelope
	if err := json.NewDecoder(resp.Body).Decode(&env); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if env.Error.Code != "internal_error" {
		t.Errorf("error.code = %q, want internal_error", env.Error.Code)
	}
	if env.Error.Message == "" {
		t.Error("error.message must not be empty")
	}
}

// TestRecoveryMiddleware_TypedErrorPanic covers the branch where the
// panic value is already an error.
func TestRecoveryMiddleware_TypedErrorPanic(t *testing.T) {
	t.Parallel()

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(errors.New("typed"))
	})

	srv := httptest.NewServer(recoveryMiddleware(logger, handler))
	defer srv.Close()

	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", resp.StatusCode)
	}
}
