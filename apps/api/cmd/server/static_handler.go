package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// withStaticServing wraps the given apiHandler to serve static files from
// staticDir if it is set. It implements SPA fallback to index.html for
// unknown non-API routes.
func withStaticServing(apiHandler http.Handler, staticDir string) (http.Handler, error) {
	if staticDir == "" {
		return apiHandler, nil
	}

	absPath, err := filepath.Abs(staticDir)
	if err != nil {
		return nil, fmt.Errorf("static dir abs path: %w", err)
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("static dir stat: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("static dir is not a directory: %s", absPath)
	}

	// Verify index.html exists as required by T-011.
	if _, err := os.Stat(filepath.Join(absPath, "index.html")); err != nil {
		return nil, fmt.Errorf("index.html not found in static dir: %w", err)
	}

	fs := http.Dir(absPath)
	fileServer := http.FileServer(fs)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// API and Health routes always go to apiHandler.
		// Precise match for /healthz and /api, or prefix for /api/.
		if path == "/healthz" || path == "/api" || strings.HasPrefix(path, "/api/") {
			apiHandler.ServeHTTP(w, r)
			return
		}

		// Only GET and HEAD requests are candidates for static serving or SPA fallback.
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			apiHandler.ServeHTTP(w, r)
			return
		}

		// Try to open the requested path.
		f, err := fs.Open(path)
		if err != nil {
			// Asset missing?
			if strings.HasPrefix(path, "/assets/") {
				// We don't want SPA fallback for missing assets.
				apiHandler.ServeHTTP(w, r)
				return
			}
			// SPA fallback: serve index.html.
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
			return
		}
		defer f.Close()

		stat, err := f.Stat()
		if err != nil {
			apiHandler.ServeHTTP(w, r)
			return
		}

		// If it's a directory and not root, fallback to index.html instead of listing.
		if stat.IsDir() && path != "/" {
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
			return
		}

		fileServer.ServeHTTP(w, r)
	}), nil
}
