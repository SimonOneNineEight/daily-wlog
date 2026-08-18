// Package server assembles the HTTP API: the chi router, middleware, and the
// handlers implementing the generated OpenAPI contract.
package server

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/apigen"
	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/logging"
)

// handlers implements apigen.StrictServerInterface.
type handlers struct {
	logger  *slog.Logger
	queries *dbgen.Queries
}

func (h handlers) GetHealth(ctx context.Context, _ apigen.GetHealthRequestObject) (apigen.GetHealthResponseObject, error) {
	version, err := h.queries.GetSchemaVersion(ctx)
	if err != nil {
		h.logger.LogAttrs(ctx, slog.LevelError, "health check database query failed",
			slog.String("error", err.Error()))
		if hub := sentry.GetHubFromContext(ctx); hub != nil {
			hub.CaptureException(err)
		}
		return apigen.GetHealth503JSONResponse{Message: "database unreachable"}, nil
	}
	return apigen.GetHealth200JSONResponse{Status: "ok", SchemaVersion: int(version)}, nil
}

// New builds the API handler on top of a database pool.
func New(logger *slog.Logger, pool *pgxpool.Pool) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(logging.AccessLog(logger))
	// Recoverer turns panics into 500s; the Sentry handler inside it captures
	// the panic and repanics so Recoverer still sees it.
	router.Use(middleware.Recoverer)
	router.Use(sentryhttp.New(sentryhttp.Options{Repanic: true}).Handle)
	h := handlers{logger: logger, queries: dbgen.New(pool)}
	return apigen.HandlerFromMux(apigen.NewStrictHandler(h, nil), router)
}
