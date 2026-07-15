# Optional Docker Packaging

This document describes how to build and run the Calculator application using Docker. Docker packaging is **optional** and is not required for local development.

The Docker implementation produces a single multi-stage image that serves both the React frontend and the Go API from the same origin, ensuring no CORS is required.

## Prerequisites

- [Docker](https://www.docker.com/) (or a compatible daemon like Podman).
- [Docker Compose](https://docs.docker.com/compose/) (optional, for the one-command workflow).

## Build and Run

### Using Docker Compose (Recommended)

Build and start the container in one command:

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:8080/](http://localhost:8080/)
- **API Health**: [http://localhost:8080/healthz](http://localhost:8080/healthz)

### Using Docker CLI

1. **Build the image**:
   ```bash
   docker build -t calculator .
   ```

2. **Run the container**:
   ```bash
   docker run --rm -p 8080:8080 --name calculator calculator
   ```

## Verification

### Health Check

From your host machine, verify the container is healthy:

```bash
curl -sSf http://localhost:8080/healthz
```

Expected response: `{"status":"ok"}`

### API Calculation

Perform a calculation through the containerized API:

```bash
curl -sSf \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","operands":[1,2]}' \
  http://localhost:8080/api/v1/calculations
```

Expected response: `{"operation":"add","operands":[1,2],"result":3}`

### Domain Error Preservation

Verify that the API contract is preserved for domain errors (e.g., division by zero):

```bash
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","operands":[1,0]}' \
  http://localhost:8080/api/v1/calculations
```

Expected: `422 Unprocessable Entity` with a JSON body containing `division_by_zero`.

### SPA Fallback

Verify that unknown non-API routes serve the frontend `index.html`:

```bash
curl -i http://localhost:8080/some/frontend/route
```

Expected: `200 OK` with the HTML content of the React app.

## Configuration

The image is configured with the following defaults:

- `PORT=8080`: The port the server listens on inside the container.
- `STATIC_DIR=/app/web`: The directory where built frontend assets are stored.

These are baked into the image and do not normally need to be overridden.

## Stop and Cleanup

To stop the container:

```bash
docker stop calculator
```

If you used Docker Compose:

```bash
docker compose down
```

## Architecture Notes

- **One Process, One Origin**: The Go server is the only process running in the container. It serves static assets, handles API requests, and provides health probes.
- **Minimal Image**: The final image is based on `distroless/static`, containing only the compiled static Go binary and the production frontend assets. No Node.js, Go toolchain, or shell is included in the final image.
- **Non-root**: The container runs as a non-root user (`nonroot:nonroot`).
- **Optional**: Adding or removing Docker support does not affect the core application logic or local development workflow.
