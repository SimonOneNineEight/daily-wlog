// Package logging owns the API's structured logging.
//
// RULE: journal content never appears in logs. No entry titles, notes, photo
// filenames, category names, or any other user-written text — IDs and counts
// only. This is a privacy invariant (see the MVP spec's observability
// decisions), not a style preference; it also keeps the E2EE door open
// (ADR-0004). Every log call added anywhere in the API must respect it.
package logging

import (
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// New returns the API's logger: JSON lines to w.
func New(w io.Writer) *slog.Logger {
	return slog.New(slog.NewJSONHandler(w, nil))
}

// AccessLog logs one line per request: method, route pattern, status, and
// duration, tagged with the request ID set by chi's RequestID middleware.
// Only the route pattern is logged, never the raw URL, so path parameters
// (which may embed user data someday) stay out of the logs.
func AccessLog(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			logger.LogAttrs(r.Context(), slog.LevelInfo, "request",
				slog.String("request_id", middleware.GetReqID(r.Context())),
				slog.String("method", r.Method),
				slog.String("route", chi.RouteContext(r.Context()).RoutePattern()),
				slog.Int("status", ww.Status()),
				slog.Float64("duration_ms", float64(time.Since(start))/float64(time.Millisecond)),
			)
		})
	}
}
