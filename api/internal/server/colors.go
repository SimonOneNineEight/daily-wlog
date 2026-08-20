package server

import (
	"context"
	"regexp"
	"strings"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/apigen"
	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
)

// colorRecentsCap is the saved-custom-colors LRU cap (~12 per the ratified
// color drawer): saving a new color beyond it evicts the oldest.
const colorRecentsCap = 12

// hexColor matches the only color shape the domain stores: #RRGGBB.
var hexColor = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

func (h handlers) ListColorRecents(ctx context.Context, _ apigen.ListColorRecentsRequestObject) (apigen.ListColorRecentsResponseObject, error) {
	colors, err := h.queries.ListColorRecents(ctx, auth.UserID(ctx))
	if err != nil {
		return apigen.ListColorRecents500JSONResponse(h.failure(ctx, "listing saved colors failed", err)), nil
	}
	if colors == nil {
		colors = []string{}
	}
	return apigen.ListColorRecents200JSONResponse{Colors: colors}, nil
}

func (h handlers) SaveColorRecent(ctx context.Context, request apigen.SaveColorRecentRequestObject) (apigen.SaveColorRecentResponseObject, error) {
	// Uppercase is the canonical form, so #ab12cd and #AB12CD are one color
	// in the LRU rather than two entries.
	color := strings.ToUpper(request.Body.Color)
	if !hexColor.MatchString(color) {
		return apigen.SaveColorRecent400JSONResponse{Message: "color must be a hex value like #RRGGBB"}, nil
	}
	userID := auth.UserID(ctx)
	if err := h.queries.SaveColorRecent(ctx, dbgen.SaveColorRecentParams{UserID: userID, Color: color}); err != nil {
		return apigen.SaveColorRecent500JSONResponse(h.failure(ctx, "saving the color failed", err)), nil
	}
	if err := h.queries.TrimColorRecents(ctx, dbgen.TrimColorRecentsParams{UserID: userID, Keep: colorRecentsCap}); err != nil {
		return apigen.SaveColorRecent500JSONResponse(h.failure(ctx, "saving the color failed", err)), nil
	}
	colors, err := h.queries.ListColorRecents(ctx, userID)
	if err != nil {
		return apigen.SaveColorRecent500JSONResponse(h.failure(ctx, "saving the color failed", err)), nil
	}
	return apigen.SaveColorRecent200JSONResponse{Colors: colors}, nil
}
