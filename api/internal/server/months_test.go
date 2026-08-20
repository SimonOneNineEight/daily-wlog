package server_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func getMonth(t *testing.T, ts *httptest.Server, token, month string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/months/"+month, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /months: %v", err)
	}
	return resp
}

type monthBody struct {
	Days []struct {
		Date        string   `json:"date"`
		CategoryIDs []string `json:"categoryIds"`
	} `json:"days"`
}

func decodeMonth(t *testing.T, resp *http.Response) monthBody {
	t.Helper()
	defer resp.Body.Close()
	var month monthBody
	if err := json.NewDecoder(resp.Body).Decode(&month); err != nil {
		t.Fatalf("decode month: %v", err)
	}
	return month
}

// mustCreateEntry creates an entry and fails the test on any non-201.
func mustCreateEntry(t *testing.T, ts *httptest.Server, token, date, categoryID string) {
	t.Helper()
	resp := createEntry(t, ts, token, map[string]string{
		"date": date, "categoryId": categoryID, "content": "x",
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create entry on %s: status %d", date, resp.StatusCode)
	}
}

func TestMonthReturnsDotsInEntryOrderWithinBoundaries(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID

	// Two entries on one mid-month day (order matters), one on the month's
	// first and last days, and two just outside either boundary.
	mustCreateEntry(t, ts, token, "2026-03-15", sport)
	mustCreateEntry(t, ts, token, "2026-03-15", work)
	mustCreateEntry(t, ts, token, "2026-03-01", work)
	mustCreateEntry(t, ts, token, "2026-03-31", sport)
	mustCreateEntry(t, ts, token, "2026-02-28", work)
	mustCreateEntry(t, ts, token, "2026-04-01", work)

	resp := getMonth(t, ts, token, "2026-03")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	month := decodeMonth(t, resp)

	if len(month.Days) != 3 {
		t.Fatalf("got %d days, want 3 (boundary entries must stay out)", len(month.Days))
	}
	if month.Days[0].Date != "2026-03-01" || month.Days[1].Date != "2026-03-15" || month.Days[2].Date != "2026-03-31" {
		t.Errorf("days out of order: %+v", month.Days)
	}
	if got := month.Days[1].CategoryIDs; len(got) != 2 || got[0] != sport || got[1] != work {
		t.Errorf("mid-month day dots not in entry order: %v (want [%s %s])", got, sport, work)
	}
}

func TestMonthValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	provisionedCategory(t, ts, token)

	for _, bad := range []string{"2026", "2026-13", "March", "2026-03-15"} {
		resp := getMonth(t, ts, token, bad)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("month %q: status = %d, want 400", bad, resp.StatusCode)
		}
	}

	resp := getMonth(t, ts, token, "1999-06")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("empty month status = %d, want 200", resp.StatusCode)
	}
	if month := decodeMonth(t, resp); len(month.Days) != 0 {
		t.Errorf("empty month returned %d days, want 0", len(month.Days))
	}
}

func TestMonthFilter(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID
	sub := decodeCategory(t, createCategory(t, ts, token, map[string]string{
		"name": "會議", "color": me.Categories[0].Color, "parentId": work,
	}))

	mustCreateEntry(t, ts, token, "2026-05-01", work)
	createEntry(t, ts, token, map[string]string{
		"date": "2026-05-02", "categoryId": work, "subcategoryId": sub.ID, "content": "x",
	}).Body.Close()
	mustCreateEntry(t, ts, token, "2026-05-03", sport)

	dates := func(month monthBody) []string {
		out := make([]string, len(month.Days))
		for i, day := range month.Days {
			out[i] = day.Date
		}
		return out
	}

	// A parent includes its children's entries.
	byParent := decodeMonth(t, getMonth(t, ts, token, "2026-05?categories="+work))
	if got := dates(byParent); len(got) != 2 || got[0] != "2026-05-01" || got[1] != "2026-05-02" {
		t.Errorf("parent filter days = %v, want the two work days", got)
	}
	// A subcategory matches only its own entries.
	bySub := decodeMonth(t, getMonth(t, ts, token, "2026-05?subcategories="+sub.ID))
	if got := dates(bySub); len(got) != 1 || got[0] != "2026-05-02" {
		t.Errorf("subcategory filter days = %v, want only the sub day", got)
	}
	// Union across both kinds of selection.
	union := decodeMonth(t, getMonth(t, ts, token, "2026-05?categories="+sport+"&subcategories="+sub.ID))
	if got := dates(union); len(got) != 2 || got[0] != "2026-05-02" || got[1] != "2026-05-03" {
		t.Errorf("union filter days = %v, want sub day and sport day", got)
	}

	resp := getMonth(t, ts, token, "2026-05?categories=not-a-uuid")
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("malformed filter status = %d, want 400", resp.StatusCode)
	}
}

func TestMonthRequiresAToken(t *testing.T) {
	resp := getMonth(t, newTestServer(t), "", "2026-03")
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
