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

// maxContentBytes caps the opaque content blob at 64 KiB: room for a long
// note, not for abuse. The blob is stored and returned verbatim and never
// parsed (ADR-0004), which is also why the title requirement is enforced by
// the client, not here.
const maxContentBytes = 64 * 1024

const dateLayout = "2006-01-02"

func (h handlers) CreateEntry(ctx context.Context, request apigen.CreateEntryRequestObject) (apigen.CreateEntryResponseObject, error) {
	body := request.Body
	entryDate, err := time.Parse(dateLayout, body.Date)
	if err != nil {
		return apigen.CreateEntry400JSONResponse{Message: "date must be YYYY-MM-DD"}, nil
	}
	if _, err := uuid.Parse(body.CategoryId); err != nil {
		return apigen.CreateEntry400JSONResponse{Message: "categoryId must be a UUID"}, nil
	}
	if body.Content == "" {
		return apigen.CreateEntry400JSONResponse{Message: "content is required"}, nil
	}
	if len(body.Content) > maxContentBytes {
		return apigen.CreateEntry400JSONResponse{Message: "content exceeds 64 KiB"}, nil
	}

	userID := auth.UserID(ctx)
	journalID, err := h.queries.GetJournal(ctx, userID)
	if err != nil {
		return apigen.CreateEntry500JSONResponse(h.failure(ctx, "creating the entry failed", err)), nil
	}
	usable, err := h.queries.CategoryIsUsable(ctx, dbgen.CategoryIsUsableParams{
		CategoryID: body.CategoryId,
		UserID:     userID,
	})
	if err != nil {
		return apigen.CreateEntry500JSONResponse(h.failure(ctx, "creating the entry failed", err)), nil
	}
	if !usable {
		return apigen.CreateEntry400JSONResponse{Message: "category not found"}, nil
	}
	row, err := h.queries.InsertEntry(ctx, dbgen.InsertEntryParams{
		JournalID:  journalID,
		AuthorID:   userID,
		EntryDate:  pgtype.Date{Time: entryDate, Valid: true},
		CategoryID: body.CategoryId,
		Content:    []byte(body.Content),
	})
	if err != nil {
		return apigen.CreateEntry500JSONResponse(h.failure(ctx, "creating the entry failed", err)), nil
	}
	return apigen.CreateEntry201JSONResponse{
		Id:         row.ID,
		Date:       body.Date,
		Position:   int(row.Position),
		CategoryId: body.CategoryId,
		AuthorId:   userID,
		Content:    body.Content,
	}, nil
}

func (h handlers) ListEntries(ctx context.Context, request apigen.ListEntriesRequestObject) (apigen.ListEntriesResponseObject, error) {
	entryDate, err := time.Parse(dateLayout, request.Params.Date)
	if err != nil {
		return apigen.ListEntries400JSONResponse{Message: "date must be YYYY-MM-DD"}, nil
	}
	userID := auth.UserID(ctx)
	journalID, err := h.queries.GetJournal(ctx, userID)
	if err != nil {
		return apigen.ListEntries500JSONResponse(h.failure(ctx, "listing entries failed", err)), nil
	}
	rows, err := h.queries.ListEntriesByDate(ctx, dbgen.ListEntriesByDateParams{
		JournalID: journalID,
		EntryDate: pgtype.Date{Time: entryDate, Valid: true},
	})
	if err != nil {
		return apigen.ListEntries500JSONResponse(h.failure(ctx, "listing entries failed", err)), nil
	}
	entries := make([]apigen.Entry, len(rows))
	for i, row := range rows {
		entries[i] = apigen.Entry{
			Id:         row.ID,
			Date:       row.EntryDate,
			Position:   int(row.Position),
			CategoryId: row.CategoryID,
			AuthorId:   row.AuthorID,
			Content:    string(row.Content),
		}
	}
	return apigen.ListEntries200JSONResponse{Entries: entries}, nil
}
