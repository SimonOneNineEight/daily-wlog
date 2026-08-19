package server_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SimonOneNineEight/daily-wlog/api/gen/dbgen"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/auth"
	"github.com/SimonOneNineEight/daily-wlog/api/internal/server"
)

// failingQuerier fault-injects database errors that are unreachable through
// the real database (a live Postgres cannot fail on exactly one of the three
// provisioning calls). Behavior tests never mock the platform; this exists
// only to prove /me fails closed on each step.
type failingQuerier struct {
	provisionErr   error
	journalErr     error
	categoriesErr  error
	categoryErr    error
	insertErr      error
	listEntriesErr error
	monthDotsErr   error
	updateErr      error
	deleteErr      error
	listIDsErr     error
	reorderErr     error
	insertCatErr   error
	subcategoryErr error
	catParentErr   error
	updateCatErr   error
	cascadeErr     error
	usageErr       error
	deleteCatErr   error
	deleteCatZero  bool
}

func (f failingQuerier) GetSchemaVersion(context.Context) (int32, error) { return 1, nil }
func (f failingQuerier) ProvisionUser(context.Context, string) error     { return f.provisionErr }
func (f failingQuerier) GetJournal(context.Context, string) (string, error) {
	return "journal-id", f.journalErr
}
func (f failingQuerier) ListCategories(context.Context, string) ([]dbgen.ListCategoriesRow, error) {
	return nil, f.categoriesErr
}
func (f failingQuerier) CategoryIsUsable(context.Context, dbgen.CategoryIsUsableParams) (bool, error) {
	return true, f.categoryErr
}
func (f failingQuerier) InsertEntry(context.Context, dbgen.InsertEntryParams) (dbgen.InsertEntryRow, error) {
	return dbgen.InsertEntryRow{ID: "entry-id", Position: 1}, f.insertErr
}
func (f failingQuerier) ListEntriesByDate(context.Context, dbgen.ListEntriesByDateParams) ([]dbgen.ListEntriesByDateRow, error) {
	return nil, f.listEntriesErr
}
func (f failingQuerier) ListMonthDots(context.Context, dbgen.ListMonthDotsParams) ([]dbgen.ListMonthDotsRow, error) {
	return nil, f.monthDotsErr
}
func (f failingQuerier) UpdateEntry(context.Context, dbgen.UpdateEntryParams) (dbgen.UpdateEntryRow, error) {
	return dbgen.UpdateEntryRow{ID: "entry-id", Position: 1}, f.updateErr
}
func (f failingQuerier) DeleteEntry(context.Context, dbgen.DeleteEntryParams) (int64, error) {
	return 1, f.deleteErr
}
func (f failingQuerier) ListEntryIDs(context.Context, dbgen.ListEntryIDsParams) ([]string, error) {
	return []string{"7f000000-0000-4000-8000-00000000000a"}, f.listIDsErr
}
func (f failingQuerier) ReorderEntries(context.Context, dbgen.ReorderEntriesParams) error {
	return f.reorderErr
}
func (f failingQuerier) InsertCategory(context.Context, dbgen.InsertCategoryParams) (dbgen.InsertCategoryRow, error) {
	return dbgen.InsertCategoryRow{ID: "category-id", Position: 1}, f.insertCatErr
}
func (f failingQuerier) SubcategoryIsUsable(context.Context, dbgen.SubcategoryIsUsableParams) (bool, error) {
	return true, f.subcategoryErr
}
func (f failingQuerier) GetCategoryParent(context.Context, dbgen.GetCategoryParentParams) (*string, error) {
	return nil, f.catParentErr
}
func (f failingQuerier) UpdateCategory(context.Context, dbgen.UpdateCategoryParams) (dbgen.UpdateCategoryRow, error) {
	return dbgen.UpdateCategoryRow{ID: "category-id", Name: "x", Color: "#111111", Icon: "tag", Position: 1}, f.updateCatErr
}
func (f failingQuerier) CascadeChildColors(context.Context, dbgen.CascadeChildColorsParams) error {
	return f.cascadeErr
}
func (f failingQuerier) CategoryUsage(context.Context, string) (dbgen.CategoryUsageRow, error) {
	return dbgen.CategoryUsageRow{}, f.usageErr
}
func (f failingQuerier) DeleteCategory(context.Context, dbgen.DeleteCategoryParams) (int64, error) {
	if f.deleteCatZero {
		return 0, nil
	}
	return 1, f.deleteCatErr
}

func TestEntriesFailClosedOnDatabaseErrors(t *testing.T) {
	token := signUpTestUser(t)
	valid := map[string]string{
		"date": "2026-08-19", "categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x",
	}
	createCases := map[string]failingQuerier{
		"journal read fails":   {journalErr: errors.New("boom")},
		"category check fails": {categoryErr: errors.New("boom")},
		"insert fails":         {insertErr: errors.New("boom")},
	}
	for name, querier := range createCases {
		t.Run("create/"+name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			resp := createEntry(t, ts, token, valid)
			resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
		})
	}
	listCases := map[string]failingQuerier{
		"journal read fails": {journalErr: errors.New("boom")},
		"list fails":         {listEntriesErr: errors.New("boom")},
	}
	for name, querier := range listCases {
		t.Run("list/"+name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			resp := listEntries(t, ts, token, "2026-08-19")
			resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
		})
	}
	editCases := map[string]struct {
		querier failingQuerier
		run     func(t *testing.T, ts *httptest.Server)
	}{
		"update journal fails": {failingQuerier{journalErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a", map[string]string{"categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x"}), 500)
		}},
		"update category fails": {failingQuerier{categoryErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a", map[string]string{"categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x"}), 500)
		}},
		"update subcategory check fails": {failingQuerier{subcategoryErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a", map[string]string{"categoryId": "7f000000-0000-4000-8000-000000000000", "subcategoryId": "7f000000-0000-4000-8000-000000000001", "content": "x"}), 500)
		}},
		"update fails": {failingQuerier{updateErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a", map[string]string{"categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x"}), 500)
		}},
		"delete journal fails": {failingQuerier{journalErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a"), 500)
		}},
		"delete fails": {failingQuerier{deleteErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteEntry(t, ts, token, "7f000000-0000-4000-8000-00000000000a"), 500)
		}},
		"reorder journal fails": {failingQuerier{journalErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, reorderDay(t, ts, token, "2026-05-09", []string{"7f000000-0000-4000-8000-00000000000a"}), 500)
		}},
		"reorder list-ids fails": {failingQuerier{listIDsErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, reorderDay(t, ts, token, "2026-05-09", []string{"7f000000-0000-4000-8000-00000000000a"}), 500)
		}},
		"reorder fails": {failingQuerier{reorderErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, reorderDay(t, ts, token, "2026-05-09", []string{"7f000000-0000-4000-8000-00000000000a"}), 500)
		}},
		"reorder relist fails": {failingQuerier{listEntriesErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, reorderDay(t, ts, token, "2026-05-09", []string{"7f000000-0000-4000-8000-00000000000a"}), 500)
		}},
	}
	for name, c := range editCases {
		t.Run("edit/"+name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), c.querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			c.run(t, ts)
		})
	}
	subCases := map[string]failingQuerier{
		"subcategory check fails": {subcategoryErr: errors.New("boom")},
	}
	for name, querier := range subCases {
		t.Run("create/"+name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			withSub := map[string]string{
				"date": "2026-08-19", "categoryId": "7f000000-0000-4000-8000-000000000000",
				"content": "x", "subcategoryId": "7f000000-0000-4000-8000-000000000001",
			}
			resp := createEntry(t, ts, token, withSub)
			resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
		})
	}
	monthCases := map[string]failingQuerier{
		"journal read fails": {journalErr: errors.New("boom")},
		"month dots fail":    {monthDotsErr: errors.New("boom")},
	}
	for name, querier := range monthCases {
		t.Run("month/"+name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			resp := getMonth(t, ts, token, "2026-08")
			resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
		})
	}
}

func TestCategoriesFailClosedOnDatabaseErrors(t *testing.T) {
	token := signUpTestUser(t)
	parentID := "7f000000-0000-4000-8000-000000000000"
	cases := map[string]struct {
		querier failingQuerier
		body    map[string]string
	}{
		"parent check fails": {
			querier: failingQuerier{categoryErr: errors.New("boom")},
			body:    map[string]string{"name": "x", "color": "#111111", "parentId": parentID},
		},
		"insert fails": {
			querier: failingQuerier{insertCatErr: errors.New("boom")},
			body:    map[string]string{"name": "x", "color": "#111111"},
		},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), tc.querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			resp := createCategory(t, ts, token, tc.body)
			resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
		})
	}
}

func TestCategoryEditsFailClosedOnDatabaseErrors(t *testing.T) {
	token := signUpTestUser(t)
	id := "7f000000-0000-4000-8000-00000000000b"
	cases := map[string]struct {
		querier failingQuerier
		run     func(t *testing.T, ts *httptest.Server)
	}{
		"patch gate fails": {failingQuerier{catParentErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchCategory(t, ts, token, id, map[string]string{"name": "x"}), 500)
		}},
		"patch update fails": {failingQuerier{updateCatErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchCategory(t, ts, token, id, map[string]string{"name": "x"}), 500)
		}},
		"patch cascade fails": {failingQuerier{cascadeErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, patchCategory(t, ts, token, id, map[string]string{"color": "#333333"}), 500)
		}},
		"delete gate fails": {failingQuerier{catParentErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteCategory(t, ts, token, id), 500)
		}},
		"delete usage fails": {failingQuerier{usageErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteCategory(t, ts, token, id), 500)
		}},
		"delete fails": {failingQuerier{deleteCatErr: errors.New("boom")}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteCategory(t, ts, token, id), 500)
		}},
		"delete races to zero rows": {failingQuerier{deleteCatZero: true}, func(t *testing.T, ts *httptest.Server) {
			checkStatus(t, deleteCategory(t, ts, token, id), 404)
		}},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), c.querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()
			c.run(t, ts)
		})
	}
}

func TestMeFailsClosedOnDatabaseErrors(t *testing.T) {
	token := signUpTestUser(t)
	cases := map[string]failingQuerier{
		"provisioning fails":  {provisionErr: errors.New("boom")},
		"journal read fails":  {journalErr: errors.New("boom")},
		"category read fails": {categoriesErr: errors.New("boom")},
	}
	for name, querier := range cases {
		t.Run(name, func(t *testing.T) {
			ts := httptest.NewServer(server.NewWithQuerier(discardLogger(), querier, auth.NewVerifier(testJWKSURL())))
			defer ts.Close()

			resp := postMe(t, ts, token)
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500", resp.StatusCode)
			}
			var body struct {
				Message string `json:"message"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&body); err != nil || body.Message == "" {
				t.Errorf("500 body should carry an Error message, got err=%v message=%q", err, body.Message)
			}
		})
	}
}

func checkStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()
	resp.Body.Close()
	if resp.StatusCode != want {
		t.Fatalf("status = %d, want %d", resp.StatusCode, want)
	}
}
