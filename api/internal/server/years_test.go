package server_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func getYear(t *testing.T, ts *httptest.Server, token, year string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/years/"+year, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /years: %v", err)
	}
	return resp
}

type yearBody struct {
	Days []struct {
		Date       string `json:"date"`
		CategoryID string `json:"categoryId"`
	} `json:"days"`
	TotalEntries int `json:"totalEntries"`
}

func decodeYear(t *testing.T, resp *http.Response) yearBody {
	t.Helper()
	defer resp.Body.Close()
	var year yearBody
	if err := json.NewDecoder(resp.Body).Decode(&year); err != nil {
		t.Fatalf("decode year: %v", err)
	}
	return year
}

func TestYearReturnsFirstEntryColorsWithinBoundaries(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID

	// Two entries on one day (first category wins), the year's first and
	// last days, and one just outside either boundary.
	mustCreateEntry(t, ts, token, "2026-03-15", sport)
	mustCreateEntry(t, ts, token, "2026-03-15", work)
	mustCreateEntry(t, ts, token, "2026-01-01", work)
	mustCreateEntry(t, ts, token, "2026-12-31", sport)
	mustCreateEntry(t, ts, token, "2025-12-31", work)
	mustCreateEntry(t, ts, token, "2027-01-01", work)

	resp := getYear(t, ts, token, "2026")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	year := decodeYear(t, resp)

	if len(year.Days) != 3 {
		t.Fatalf("got %d days, want 3 (boundary entries must stay out)", len(year.Days))
	}
	if year.Days[0].Date != "2026-01-01" || year.Days[1].Date != "2026-03-15" || year.Days[2].Date != "2026-12-31" {
		t.Errorf("days out of order: %+v", year.Days)
	}
	if year.Days[1].CategoryID != sport {
		t.Errorf("mid-year day category = %s, want the FIRST entry's %s", year.Days[1].CategoryID, sport)
	}
	if year.TotalEntries != 4 {
		t.Errorf("totalEntries = %d, want 4 (boundary entries must stay out)", year.TotalEntries)
	}
}

func TestYearColorFollowsEntryOrder(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID

	mustCreateEntry(t, ts, token, "2026-06-01", sport)
	mustCreateEntry(t, ts, token, "2026-06-01", work)

	first := decodeYear(t, getYear(t, ts, token, "2026"))
	if len(first.Days) != 1 || first.Days[0].CategoryID != sport {
		t.Fatalf("before reorder: %+v, want the sport entry first", first.Days)
	}

	// Reverse the day's order: the year color must follow.
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	listResp := listEntries(t, ts, token, "2026-06-01")
	defer listResp.Body.Close()
	if err := json.NewDecoder(listResp.Body).Decode(&list); err != nil || len(list.Entries) != 2 {
		t.Fatalf("list day entries: err=%v n=%d", err, len(list.Entries))
	}
	reorderDay(t, ts, token, "2026-06-01", []string{list.Entries[1].ID, list.Entries[0].ID}).Body.Close()

	second := decodeYear(t, getYear(t, ts, token, "2026"))
	if len(second.Days) != 1 || second.Days[0].CategoryID != work {
		t.Errorf("after reorder: %+v, want the work entry first", second.Days)
	}
}

func TestYearValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	provisionedCategory(t, ts, token)

	for _, bad := range []string{"26", "2026-03", "March", "20261"} {
		resp := getYear(t, ts, token, bad)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("year %q: status = %d, want 400", bad, resp.StatusCode)
		}
	}

	resp := getYear(t, ts, token, "1999")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("empty year status = %d, want 200", resp.StatusCode)
	}
	if year := decodeYear(t, resp); len(year.Days) != 0 || year.TotalEntries != 0 {
		t.Errorf("empty year returned %d days / %d entries, want 0 / 0", len(year.Days), year.TotalEntries)
	}
}

func TestYearRequiresAToken(t *testing.T) {
	resp := getYear(t, newTestServer(t), "", "2026")
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
