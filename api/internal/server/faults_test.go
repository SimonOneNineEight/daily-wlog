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
	provisionErr  error
	journalErr    error
	categoriesErr error
}

func (f failingQuerier) GetSchemaVersion(context.Context) (int32, error) { return 1, nil }
func (f failingQuerier) ProvisionUser(context.Context, string) error     { return f.provisionErr }
func (f failingQuerier) GetJournal(context.Context, string) (string, error) {
	return "journal-id", f.journalErr
}
func (f failingQuerier) ListCategories(context.Context, string) ([]dbgen.ListCategoriesRow, error) {
	return nil, f.categoriesErr
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
