package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strconv"
	"syscall"
	"time"

	"calculator/apps/api/internal/httpapi"
)

// Config holds the server runtime configuration.
type Config struct {
	Port string
}

// Default timeouts as required by T-004.
const (
	defaultReadHeaderTimeout = 5 * time.Second
	defaultReadTimeout       = 10 * time.Second
	defaultWriteTimeout      = 10 * time.Second
	defaultIdleTimeout       = 60 * time.Second
	defaultShutdownTimeout   = 10 * time.Second
)

// Run reads configuration, binds a TCP listener, and delegates to
// runWithListener. It blocks until the server has shut down or an error
// occurs.
//
// The stdout parameter is currently unused; it is kept so that future
// operator-facing output (health probes, ready hooks) can be routed
// through main-owned sinks without changing the entry-point signature.
func Run(ctx context.Context, stdout, stderr io.Writer, getenv func(string) string) error {
	_ = stdout

	cfg, err := loadConfig(getenv)
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}

	addr := net.JoinHostPort("", cfg.Port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen %q: %w", addr, err)
	}

	return runWithListener(ctx, stderr, ln)
}

// runWithListener owns the http.Server lifecycle for an already-bound
// listener. It is exercised directly by tests so they do not need to
// scrape logs to discover the bound address.
//
// Listener ownership: once runWithListener is called, it owns ln and
// will close it (via http.Server.Serve / Shutdown).
func runWithListener(ctx context.Context, stderr io.Writer, ln net.Listener) error {
	logger := slog.New(slog.NewJSONHandler(stderr, nil))

	handler := httpapi.NewHandler()
	handler = loggingMiddleware(logger, handler)
	handler = recoveryMiddleware(logger, handler)

	srv := &http.Server{
		Addr:              ln.Addr().String(),
		Handler:           handler,
		ReadHeaderTimeout: defaultReadHeaderTimeout,
		ReadTimeout:       defaultReadTimeout,
		WriteTimeout:      defaultWriteTimeout,
		IdleTimeout:       defaultIdleTimeout,
	}

	// serveErrCh is buffered (capacity 1) and receives exactly one value
	// from the serve goroutine — either the terminal error from Serve or
	// nil when Serve returned http.ErrServerClosed (the expected close).
	// Every code path below consumes from serveErrCh so the goroutine
	// cannot leak.
	serveErrCh := make(chan error, 1)
	go func() {
		logger.Info("starting server", slog.String("addr", ln.Addr().String()))
		err := srv.Serve(ln)
		if errors.Is(err, http.ErrServerClosed) {
			serveErrCh <- nil
			return
		}
		serveErrCh <- err
	}()

	sigCtx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serveErrCh:
		// Serve returned before any shutdown signal was observed.
		if err != nil {
			return fmt.Errorf("serve: %w", err)
		}
		// ErrServerClosed without a shutdown request is unusual but not
		// an error the caller can act on.
		return nil

	case <-sigCtx.Done():
		logger.Info("shutting down server")

		// Shutdown must use a fresh, bounded context — never the
		// already-cancelled signal context.
		shutdownCtx, cancel := context.WithTimeout(context.Background(), defaultShutdownTimeout)
		defer cancel()

		shutdownErr := srv.Shutdown(shutdownCtx)
		// Wait for the serve goroutine to exit before returning so that
		// listeners and goroutines are guaranteed released.
		serveErr := <-serveErrCh

		switch {
		case shutdownErr != nil:
			return fmt.Errorf("shutdown: %w", shutdownErr)
		case serveErr != nil:
			return fmt.Errorf("serve: %w", serveErr)
		}
		logger.Info("server stopped gracefully")
		return nil
	}
}

// loadConfig reads and validates the PORT environment variable.
// The accepted range is 0–65535 so that tests can bind PORT=0 as
// required by T-004 "Required behavior".
func loadConfig(getenv func(string) string) (Config, error) {
	portStr := getenv("PORT")
	if portStr == "" {
		portStr = "8080"
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return Config{}, fmt.Errorf("invalid PORT (not a number): %q", portStr)
	}

	if port < 0 || port > 65535 {
		return Config{}, fmt.Errorf("invalid PORT (out of range): %d", port)
	}

	return Config{
		Port: strconv.Itoa(port),
	}, nil
}

func recoveryMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				err, ok := p.(error)
				if !ok {
					err = fmt.Errorf("%v", p)
				}

				logger.Error("panic recovered",
					slog.Any("error", err),
					slog.String("stack", string(debug.Stack())),
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
				)

				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.Header().Set("Cache-Control", "no-store")
				w.WriteHeader(http.StatusInternalServerError)

				env := httpapi.ErrorEnvelope{}
				env.Error.Code = "internal_error"
				env.Error.Message = "An unexpected internal error occurred."
				_ = json.NewEncoder(w).Encode(env)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)

		logger.Info("request completed",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rw.status),
			slog.Duration("duration", duration),
		)
	})
}
