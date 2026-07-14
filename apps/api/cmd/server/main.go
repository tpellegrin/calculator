// Command server is the entry point for the Calculator HTTP API.
//
// The server implementation is intentionally deferred until the arithmetic
// contract, operation semantics, and error taxonomy are defined. This
// placeholder compiles and exits with a clear message so tooling
// (go build, go vet, CI) can validate the workspace boundary today
// without pretending the API exists.
//
// It does not open a network port, does not register handlers, and does
// not return canned responses. Real transport wiring will land in
// apps/api/internal/httpapi in a follow-up task.
package main

import (
	"context"
	"fmt"
	"os"
)

func main() {
	ctx := context.Background()
	if err := Run(ctx, os.Stdout, os.Stderr, os.Getenv); err != nil {
		fmt.Fprintf(os.Stderr, "server failed: %v\n", err)
		os.Exit(1)
	}
}
