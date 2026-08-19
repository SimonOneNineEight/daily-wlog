package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func patchEntry(t *testing.T, ts *httptest.Server, token, id string, body map[string]string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPatch, ts.URL+"/entries/"+id, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PATCH /entries/%s: %v", id, err)
	}
	return resp
}

func deleteEntry(t *testing.T, ts *httptest.Server, token, id string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, ts.URL+"/entries/"+id, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE /entries/%s: %v", id, err)
	}
	return resp
}

func reorderDay(t *testing.T, ts *httptest.Server, token, date string, entryIDs []string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(map[string][]string{"entryIds": entryIDs})
	req, err := http.NewRequest(http.MethodPut, ts.URL+"/days/"+date+"/order", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT /days/%s/order: %v", date, err)
	}
	return resp
}

func listDay(t *testing.T, ts *httptest.Server, token, date string) []entryBody {
	t.Helper()
	resp := listEntries(t, ts, token, date)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list status = %d, want 200", resp.StatusCode)
	}
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	return list.Entries
}

func TestUpdateEntryReplacesFields(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID

	created := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-05-05", "categoryId": work, "content": "before",
	}))

	resp := patchEntry(t, ts, token, created.ID, map[string]string{
		"categoryId": sport, "content": "after",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	updated := decodeEntry(t, resp)
	if updated.ID != created.ID || updated.Position != created.Position || updated.Date != "2026-05-05" {
		t.Errorf("identity fields changed: %+v", updated)
	}
	if updated.CategoryID != sport || updated.Content != "after" {
		t.Errorf("update not applied: %+v", updated)
	}

	listed := listDay(t, ts, token, "2026-05-05")
	if len(listed) != 1 || listed[0].Content != "after" || listed[0].CategoryID != sport {
		t.Errorf("list does not reflect the update: %+v", listed)
	}
}

func TestUpdateEntryValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work := me.Categories[0].ID
	created := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-05-06", "categoryId": work, "content": "x",
	}))

	stranger := signUpTestUser(t)
	provisionedCategory(t, ts, stranger)

	badRequests := map[string]map[string]string{
		"empty content":     {"categoryId": work, "content": ""},
		"unknown category":  {"categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x"},
		"bad category id":   {"categoryId": "nope", "content": "x"},
		"oversized content": {"categoryId": work, "content": strings.Repeat("a", 64*1024+1)},
	}
	for name, body := range badRequests {
		t.Run(name, func(t *testing.T) {
			resp := patchEntry(t, ts, token, created.ID, body)
			resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
		})
	}

	notFound := map[string]struct{ token, id string }{
		"malformed id":     {token, "not-a-uuid"},
		"unknown id":       {token, "7f000000-0000-4000-8000-000000000001"},
		"stranger's entry": {stranger, created.ID},
	}
	for name, c := range notFound {
		t.Run(name, func(t *testing.T) {
			resp := patchEntry(t, ts, c.token, c.id, map[string]string{
				"categoryId": provisionedCategory(t, ts, c.token), "content": "x",
			})
			resp.Body.Close()
			if resp.StatusCode != http.StatusNotFound {
				t.Fatalf("status = %d, want 404", resp.StatusCode)
			}
		})
	}
}

func TestDeleteEntry(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	work := provisionedCategory(t, ts, token)

	first := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-05-07", "categoryId": work, "content": "one",
	}))
	second := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-05-07", "categoryId": work, "content": "two",
	}))

	stranger := signUpTestUser(t)
	provisionedCategory(t, ts, stranger)
	resp := deleteEntry(t, ts, stranger, first.ID)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("stranger delete status = %d, want 404", resp.StatusCode)
	}

	resp = deleteEntry(t, ts, token, "not-a-uuid")
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("malformed id delete status = %d, want 404", resp.StatusCode)
	}

	resp = deleteEntry(t, ts, token, first.ID)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status = %d, want 204", resp.StatusCode)
	}

	resp = deleteEntry(t, ts, token, first.ID)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("second delete status = %d, want 404", resp.StatusCode)
	}

	listed := listDay(t, ts, token, "2026-05-07")
	if len(listed) != 1 || listed[0].ID != second.ID {
		t.Errorf("day should hold only the second entry, got %+v", listed)
	}
}

func TestReorderDayPersistsOrderEverywhere(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport, food := me.Categories[0].ID, me.Categories[1].ID, me.Categories[2].ID

	a := decodeEntry(t, createEntry(t, ts, token, map[string]string{"date": "2026-05-08", "categoryId": work, "content": "a"}))
	b := decodeEntry(t, createEntry(t, ts, token, map[string]string{"date": "2026-05-08", "categoryId": sport, "content": "b"}))
	c := decodeEntry(t, createEntry(t, ts, token, map[string]string{"date": "2026-05-08", "categoryId": food, "content": "c"}))

	resp := reorderDay(t, ts, token, "2026-05-08", []string{c.ID, a.ID, b.ID})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	resp.Body.Close()
	if len(list.Entries) != 3 {
		t.Fatalf("got %d entries, want 3", len(list.Entries))
	}
	for i, want := range []string{c.ID, a.ID, b.ID} {
		if list.Entries[i].ID != want {
			t.Errorf("slot %d = %s, want %s", i, list.Entries[i].ID, want)
		}
		if list.Entries[i].Position != i+1 {
			t.Errorf("slot %d position = %d, want %d (position integrity)", i, list.Entries[i].Position, i+1)
		}
	}

	// The month endpoint's dot order follows the new positions immediately.
	monthResp := getMonth(t, ts, token, "2026-05")
	month := decodeMonth(t, monthResp)
	var day *struct {
		Date        string   `json:"date"`
		CategoryIDs []string `json:"categoryIds"`
	}
	for i := range month.Days {
		if month.Days[i].Date == "2026-05-08" {
			day = &month.Days[i]
		}
	}
	if day == nil {
		t.Fatal("2026-05-08 missing from month")
	}
	if day.CategoryIDs[0] != food || day.CategoryIDs[1] != work || day.CategoryIDs[2] != sport {
		t.Errorf("month dot order = %v, want food, work, sport", day.CategoryIDs)
	}
}

func TestReorderDayValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	work := provisionedCategory(t, ts, token)

	a := decodeEntry(t, createEntry(t, ts, token, map[string]string{"date": "2026-05-09", "categoryId": work, "content": "a"}))
	b := decodeEntry(t, createEntry(t, ts, token, map[string]string{"date": "2026-05-09", "categoryId": work, "content": "b"}))

	cases := map[string][]string{
		"missing an entry": {a.ID},
		"duplicate entry":  {a.ID, a.ID},
		"foreign id":       {a.ID, "7f000000-0000-4000-8000-000000000002"},
	}
	for name, ids := range cases {
		t.Run(name, func(t *testing.T) {
			resp := reorderDay(t, ts, token, "2026-05-09", ids)
			resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
		})
	}

	resp := reorderDay(t, ts, token, "not-a-date", []string{a.ID, b.ID})
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("bad date status = %d, want 400", resp.StatusCode)
	}
}

func TestEntryEditingRequiresAToken(t *testing.T) {
	ts := newTestServer(t)
	for name, resp := range map[string]*http.Response{
		"patch":   patchEntry(t, ts, "", "x", map[string]string{"categoryId": "c", "content": "x"}),
		"delete":  deleteEntry(t, ts, "", "x"),
		"reorder": reorderDay(t, ts, "", "2026-05-09", []string{"x"}),
	} {
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("%s status = %d, want 401", name, resp.StatusCode)
		}
	}
}

func TestUpdateEntrySubcategory(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0].ID, me.Categories[1].ID

	subResp := createCategory(t, ts, token, map[string]string{
		"name": "健身房", "color": "#73B062", "parentId": sport,
	})
	if subResp.StatusCode != http.StatusCreated {
		t.Fatalf("create subcategory: status %d", subResp.StatusCode)
	}
	var sub struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(subResp.Body).Decode(&sub); err != nil {
		t.Fatalf("decode subcategory: %v", err)
	}
	subResp.Body.Close()

	created := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-05-10", "categoryId": work, "content": "x",
	}))

	// Refine into sport + its subcategory.
	resp := patchEntry(t, ts, token, created.ID, map[string]string{
		"categoryId": sport, "subcategoryId": sub.ID, "content": "x",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	updated := decodeEntry(t, resp)
	if updated.SubcategoryID == nil || *updated.SubcategoryID != sub.ID {
		t.Errorf("subcategoryId = %v, want %s", updated.SubcategoryID, sub.ID)
	}

	// Editing without the refinement clears it (full replacement semantics).
	cleared := decodeEntry(t, patchEntry(t, ts, token, created.ID, map[string]string{
		"categoryId": sport, "content": "x",
	}))
	if cleared.SubcategoryID != nil {
		t.Errorf("subcategoryId = %v, want cleared", cleared.SubcategoryID)
	}

	// A refinement must be a child of exactly the entry's category.
	for name, body := range map[string]map[string]string{
		"subcategory of another category": {"categoryId": work, "subcategoryId": sub.ID, "content": "x"},
		"malformed subcategory":           {"categoryId": sport, "subcategoryId": "nope", "content": "x"},
	} {
		t.Run(name, func(t *testing.T) {
			resp := patchEntry(t, ts, token, created.ID, body)
			resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
		})
	}
}
