# Stage 1: Build the React frontend
FROM node:20-alpine AS web-builder

# Set working directory
WORKDIR /app

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy root manifests and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy apps/web manifest
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source and configuration
COPY apps/web ./apps/web/

# Build the frontend
# We use same-origin /api so no VITE_API_BASE_URL is needed.
RUN pnpm build:web

# Stage 2: Build the Go server
FROM golang:1.22-alpine AS api-builder

# Set working directory
WORKDIR /app

# Copy go.mod from apps/api
COPY apps/api/go.mod ./apps/api/

# Download dependencies
RUN cd apps/api && go mod download

# Copy Go source
COPY apps/api ./apps/api/

# Build the server binary
# CGO_ENABLED=0 ensures a static binary.
RUN cd apps/api && \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/calculator ./cmd/server

# Stage 3: Final runtime image
FROM gcr.io/distroless/static-debian12:nonroot AS final

# Set metadata
LABEL maintainer="Calculator Team"

# Set working directory
WORKDIR /app

# Copy the server binary from api-builder
COPY --from=api-builder /out/calculator /app/calculator

# Copy the built frontend assets from web-builder
COPY --from=web-builder /app/apps/web/dist /app/web

# Set environment variables
ENV STATIC_DIR=/app/web
ENV PORT=8080

# Expose port 8080
EXPOSE 8080

# Use non-root user (already defined in distroless:nonroot)
USER nonroot:nonroot

# Entrypoint to run the server
ENTRYPOINT ["/app/calculator"]
