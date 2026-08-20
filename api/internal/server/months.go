package server

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/apigen"
	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
)

const monthLayout = "2006-01"

// filterIDs unpacks the optional filter params (#13). Empty non-nil slices
// keep the query's no-lens path (a nil array reads as NULL in Postgres and
// would filter everything out); a malformed id surfaces as false.
func filterIDs(categories, subcategories *[]string) (cats, subs []string, ok bool) {
	cats, subs = []string{}, []string{}
	for _, param := range []*[]string{categories, subcategories} {
		if param == nil {
			continue
		}
		for _, id := range *param {
			if _, err := uuid.Parse(id); err != nil {
				return nil, nil, false
			}
		}
	}
	if categories != nil {
		cats = *categories
	}
	if subcategories != nil {
		subs = *subcategories
	}
	return cats, subs, true
}

func (h handlers) GetMonth(ctx context.Context, request apigen.GetMonthRequestObject) (apigen.GetMonthResponseObject, error) {
	firstDay, err := time.Parse(monthLayout, request.Month)
	if err != nil {
		return apigen.GetMonth400JSONResponse{Message: "month must be YYYY-MM"}, nil
	}
	cats, subs, ok := filterIDs(request.Params.Categories, request.Params.Subcategories)
	if !ok {
		return apigen.GetMonth400JSONResponse{Message: "filter ids must be UUIDs"}, nil
	}
	userID := auth.UserID(ctx)
	journalID, err := h.queries.GetJournal(ctx, userID)
	if err != nil {
		return apigen.GetMonth500JSONResponse(h.failure(ctx, "loading the month failed", err)), nil
	}
	rows, err := h.queries.ListMonthDots(ctx, dbgen.ListMonthDotsParams{
		JournalID:      journalID,
		FirstDay:       pgtype.Date{Time: firstDay, Valid: true},
		NextMonth:      pgtype.Date{Time: firstDay.AddDate(0, 1, 0), Valid: true},
		CategoryIds:    cats,
		SubcategoryIds: subs,
	})
	if err != nil {
		return apigen.GetMonth500JSONResponse(h.failure(ctx, "loading the month failed", err)), nil
	}

	// Rows arrive in date-then-position order; fold them into days.
	days := []apigen.MonthDay{}
	for _, row := range rows {
		if len(days) == 0 || days[len(days)-1].Date != row.EntryDate {
			days = append(days, apigen.MonthDay{Date: row.EntryDate, CategoryIds: []string{}})
		}
		days[len(days)-1].CategoryIds = append(days[len(days)-1].CategoryIds, row.CategoryID)
	}
	return apigen.GetMonth200JSONResponse{Days: days}, nil
}
