package server

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/apigen"
	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
)

const monthLayout = "2006-01"

func (h handlers) GetMonth(ctx context.Context, request apigen.GetMonthRequestObject) (apigen.GetMonthResponseObject, error) {
	firstDay, err := time.Parse(monthLayout, request.Month)
	if err != nil {
		return apigen.GetMonth400JSONResponse{Message: "month must be YYYY-MM"}, nil
	}
	userID := auth.UserID(ctx)
	journalID, err := h.queries.GetJournal(ctx, userID)
	if err != nil {
		return apigen.GetMonth500JSONResponse(h.failure(ctx, "loading the month failed", err)), nil
	}
	rows, err := h.queries.ListMonthDots(ctx, dbgen.ListMonthDotsParams{
		JournalID: journalID,
		FirstDay:  pgtype.Date{Time: firstDay, Valid: true},
		NextMonth: pgtype.Date{Time: firstDay.AddDate(0, 1, 0), Valid: true},
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
