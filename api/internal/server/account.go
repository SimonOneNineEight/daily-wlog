package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/apigen"
	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
)

// Account lifecycle (#15): deactivation is immediate and reversible until
// the 30-day purge (internal/purge); the audit trail records every step.

func (h handlers) DeactivateMe(ctx context.Context, _ apigen.DeactivateMeRequestObject) (apigen.DeactivateMeResponseObject, error) {
	userID := auth.UserID(ctx)
	rows, err := h.queries.DeactivateAccount(ctx, userID)
	if err != nil {
		return apigen.DeactivateMe500JSONResponse(h.failure(ctx, "deactivation failed", err)), nil
	}
	// rows == 0 means already deactivated: idempotent, no second audit line.
	if rows > 0 {
		if err := h.queries.InsertAccountAudit(ctx, dbgen.InsertAccountAuditParams{
			UserID: userID,
			Event:  "deactivated",
		}); err != nil {
			return apigen.DeactivateMe500JSONResponse(h.failure(ctx, "deactivation failed", err)), nil
		}
	}
	return apigen.DeactivateMe204Response{}, nil
}

// deactivationGate answers 403 on every route but /me while an account is
// deactivated. POST /me stays open as the reactivation path, DELETE /me for
// idempotent deactivation; unauthenticated routes carry no user id and pass.
func deactivationGate(queries dbgen.Querier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := auth.UserID(r.Context())
			if userID == "" || r.URL.Path == "/me" {
				next.ServeHTTP(w, r)
				return
			}
			deletedAt, err := queries.GetAccountStatus(r.Context(), userID)
			// ErrNoRows is a signed-in user who never provisioned: active.
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{"message": "account check failed"})
				return
			}
			if err == nil && deletedAt.Valid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{"message": "account is deactivated"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
