// Package api holds go:generate directives for the code generated from the
// OpenAPI contract (openapi/openapi.yaml) and the sqlc queries. Run
// `go generate ./...` after changing either; CI fails if output drifts.
package api

//go:generate go tool oapi-codegen -config oapi-codegen.yaml ../openapi/openapi.yaml
//go:generate go tool sqlc generate
