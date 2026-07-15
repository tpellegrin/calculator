.PHONY: install dev-web build-web test-web validate-web validate api-vet api-build api-test

install:
	pnpm install

dev-web:
	pnpm dev:web

build-web:
	pnpm build:web

test-web:
	pnpm test:web

validate-web:
	pnpm validate:web

validate: validate-web

api-vet:
	cd apps/api && go vet ./...

api-build:
	cd apps/api && go build ./...

api-test:
	cd apps/api && go test ./...

coverage-api:
	cd apps/api && go test ./... -coverprofile=coverage.out
	cd apps/api && go tool cover -func=coverage.out | tail -n 1
