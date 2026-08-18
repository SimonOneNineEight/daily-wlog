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
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/logging"
)

// handlers implements apigen.StrictServerInterface.
type handlers struct {
	logger  *slog.Logger
	queries dbgen.Querier
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

func (h handlers) ProvisionMe(ctx context.Context, _ apigen.ProvisionMeRequestObject) (apigen.ProvisionMeResponseObject, error) {
	userID := auth.UserID(ctx)
	if err := h.queries.ProvisionUser(ctx, userID); err != nil {
		return apigen.ProvisionMe500JSONResponse(h.failure(ctx, "provisioning failed", err)), nil
	}
	journalID, err := h.queries.GetJournal(ctx, userID)
	if err != nil {
		return apigen.ProvisionMe500JSONResponse(h.failure(ctx, "provisioning failed", err)), nil
	}
	rows, err := h.queries.ListCategories(ctx, userID)
	if err != nil {
		return apigen.ProvisionMe500JSONResponse(h.failure(ctx, "provisioning failed", err)), nil
	}
	categories := make([]apigen.Category, len(rows))
	for i, row := range rows {
		categories[i] = apigen.Category{
			Id:       row.ID,
			Name:     row.Name,
			Color:    row.Color,
			Icon:     row.Icon,
			ParentId: row.ParentID,
			Position: int(row.Position),
		}
	}
	return apigen.ProvisionMe200JSONResponse{UserId: userID, JournalId: journalID, Categories: categories}, nil
}

// failure logs an operation failure, reports it to Sentry, and returns the
// contract Error. Only the driver error is logged; journal content never
// appears (entry content is opaque bytes the server cannot read anyway).
func (h handlers) failure(ctx context.Context, message string, err error) apigen.Error {
	h.logger.LogAttrs(ctx, slog.LevelError, message, slog.String("error", err.Error()))
	if hub := sentry.GetHubFromContext(ctx); hub != nil {
		hub.CaptureException(err)
	}
	return apigen.Error{Message: message}
}

// New builds the API handler on top of a database pool.
func New(logger *slog.Logger, pool *pgxpool.Pool, verifier *auth.Verifier) http.Handler {
	return NewWithQuerier(logger, dbgen.New(pool), verifier)
}

// NewWithQuerier exists so tests can inject a fault-injecting Querier for
// database error paths unreachable through the real database; behavior tests
// use New against local Supabase.
func NewWithQuerier(logger *slog.Logger, queries dbgen.Querier, verifier *auth.Verifier) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(logging.AccessLog(logger))
	// Recoverer turns panics into 500s; the Sentry handler inside it captures
	// the panic and repanics so Recoverer still sees it.
	router.Use(middleware.Recoverer)
	router.Use(sentryhttp.New(sentryhttp.Options{Repanic: true}).Handle)
	router.Use(auth.Middleware(verifier, map[string]bool{"/healthz": true}))
	h := handlers{logger: logger, queries: queries}
	return apigen.HandlerFromMux(apigen.NewStrictHandler(h, nil), router)
}
