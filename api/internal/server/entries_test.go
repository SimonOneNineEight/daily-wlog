package server_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// tokenSub decodes the JWT payload's sub claim (no verification; test-only).
func tokenSub(t *testing.T, token string) string {
	t.Helper()
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("token has %d parts, want 3", len(parts))
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("decode token payload: %v", err)
	}
	var claims struct {
		Sub string `json:"sub"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		t.Fatalf("parse token payload: %v", err)
	}
	return claims.Sub
}

// provisionedCategory provisions the user and returns their first category id.
func provisionedCategory(t *testing.T, ts *httptest.Server, token string) string {
	t.Helper()
	me := decodeMe(t, postMe(t, ts, token))
	if len(me.Categories) == 0 {
		t.Fatal("provisioning returned no categories")
	}
	return me.Categories[0].ID
}

func createEntry(t *testing.T, ts *httptest.Server, token string, body map[string]string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, ts.URL+"/entries", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST /entries: %v", err)
	}
	return resp
}

func listEntries(t *testing.T, ts *httptest.Server, token, date string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/entries?date="+date, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /entries: %v", err)
	}
	return resp
}

type entryBody struct {
	ID            string       `json:"id"`
	Date          string       `json:"date"`
	Position      int          `json:"position"`
	CategoryID    string       `json:"categoryId"`
	SubcategoryID *string      `json:"subcategoryId"`
	AuthorID      string       `json:"authorId"`
	Content       string       `json:"content"`
	Photos        *[]photoBody `json:"photos"`
}

func decodeEntry(t *testing.T, resp *http.Response) entryBody {
	t.Helper()
	defer resp.Body.Close()
	var entry entryBody
	if err := json.NewDecoder(resp.Body).Decode(&entry); err != nil {
		t.Fatalf("decode entry: %v", err)
	}
	return entry
}

func TestCreateEntryRoundTrip(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	categoryID := provisionedCategory(t, ts, token)

	// Deliberately not JSON: the server must store and return the blob
	// verbatim without ever parsing it (ADR-0004).
	opaque := `v1|{"not valid json… 標題`
	resp := createEntry(t, ts, token, map[string]string{
		"date": "2026-08-19", "categoryId": categoryID, "content": opaque,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	first := decodeEntry(t, resp)
	if first.Position != 1 {
		t.Errorf("first entry position = %d, want 1", first.Position)
	}
	if first.Content != opaque {
		t.Errorf("content came back altered: %q", first.Content)
	}
	if first.AuthorID != tokenSub(t, token) {
		t.Errorf("authorId = %q, want the token subject", first.AuthorID)
	}
	if first.Date != "2026-08-19" || first.CategoryID != categoryID || first.ID == "" {
		t.Errorf("entry echo wrong: %+v", first)
	}

	second := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-08-19", "categoryId": categoryID, "content": "second",
	}))
	if second.Position != 2 {
		t.Errorf("second entry position = %d, want 2", second.Position)
	}

	listResp := listEntries(t, ts, token, "2026-08-19")
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("list status = %d, want 200", listResp.StatusCode)
	}
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Entries) != 2 {
		t.Fatalf("listed %d entries, want 2", len(list.Entries))
	}
	if list.Entries[0].ID != first.ID || list.Entries[1].ID != second.ID {
		t.Error("entries not listed in position order")
	}
	if list.Entries[0].Content != opaque {
		t.Errorf("listed content came back altered: %q", list.Entries[0].Content)
	}
}

func TestCreateEntryValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	categoryID := provisionedCategory(t, ts, token)

	stranger := signUpTestUser(t)
	strangerCategory := provisionedCategory(t, ts, stranger)

	cases := map[string]map[string]string{
		"missing content":     {"date": "2026-08-19", "categoryId": categoryID, "content": ""},
		"oversized content":   {"date": "2026-08-19", "categoryId": categoryID, "content": strings.Repeat("a", 64*1024+1)},
		"bad date":            {"date": "not-a-date", "categoryId": categoryID, "content": "x"},
		"malformed category":  {"date": "2026-08-19", "categoryId": "not-a-uuid", "content": "x"},
		"unknown category":    {"date": "2026-08-19", "categoryId": "7f000000-0000-4000-8000-000000000000", "content": "x"},
		"stranger's category": {"date": "2026-08-19", "categoryId": strangerCategory, "content": "x"},
		"oversized idempotency key": {
			"date": "2026-08-19", "categoryId": categoryID, "content": "x",
			"idempotencyKey": strings.Repeat("k", 65),
		},
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			resp := createEntry(t, ts, token, body)
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
			var errBody struct {
				Message string `json:"message"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&errBody); err != nil || errBody.Message == "" {
				t.Errorf("400 body should carry an Error message, got err=%v message=%q", err, errBody.Message)
			}
		})
	}
}

func TestEntriesRequireAToken(t *testing.T) {
	ts := newTestServer(t)
	resp := createEntry(t, ts, "", map[string]string{"date": "2026-08-19", "categoryId": "x", "content": "x"})
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("create status = %d, want 401", resp.StatusCode)
	}
	resp = listEntries(t, ts, "", "2026-08-19")
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("list status = %d, want 401", resp.StatusCode)
	}
}

func TestListEntriesValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	provisionedCategory(t, ts, token)

	resp := listEntries(t, ts, token, "yesterday")
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("bad date status = %d, want 400", resp.StatusCode)
	}

	resp = listEntries(t, ts, token, "1999-01-02")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("empty date status = %d, want 200", resp.StatusCode)
	}
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Entries) != 0 {
		t.Errorf("empty date listed %d entries, want 0", len(list.Entries))
	}
}

func TestCreateEntryIdempotentReplay(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	categoryID := provisionedCategory(t, ts, token)

	// The lost-response window (#17): the create landed but the client never
	// saw the 201, so it retries the byte-identical body, same key.
	body := map[string]string{
		"date": "2026-08-19", "categoryId": categoryID, "content": "kept once",
		"idempotencyKey": "d-mfz3-walk01",
	}
	firstResp := createEntry(t, ts, token, body)
	if firstResp.StatusCode != http.StatusCreated {
		t.Fatalf("first status = %d, want 201", firstResp.StatusCode)
	}
	first := decodeEntry(t, firstResp)

	replayResp := createEntry(t, ts, token, body)
	if replayResp.StatusCode != http.StatusCreated {
		t.Fatalf("replay status = %d, want 201", replayResp.StatusCode)
	}
	replay := decodeEntry(t, replayResp)
	if replay.ID != first.ID || replay.Position != first.Position {
		t.Errorf("replay made a new Entry: first %+v, replay %+v", first, replay)
	}
	if replay.Content != "kept once" || replay.Date != "2026-08-19" || replay.CategoryID != categoryID {
		t.Errorf("replay echo wrong: %+v", replay)
	}

	// A different key is an ordinary create.
	other := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-08-19", "categoryId": categoryID, "content": "second",
		"idempotencyKey": "d-mfz3-walk02",
	}))
	if other.ID == first.ID {
		t.Error("a different key replayed the first Entry")
	}
	if other.Position != 2 {
		t.Errorf("second entry position = %d, want 2", other.Position)
	}

	if entries := listDay(t, ts, token, "2026-08-19"); len(entries) != 2 {
		t.Errorf("day holds %d entries, want 2 — the replay duplicated", len(entries))
	}
}

func TestIdempotencyKeysArePerUser(t *testing.T) {
	ts := newTestServer(t)
	tokenA := signUpTestUser(t)
	categoryA := provisionedCategory(t, ts, tokenA)
	tokenB := signUpTestUser(t)
	categoryB := provisionedCategory(t, ts, tokenB)

	// Draft ids are generated per device; two Users can collide on the same
	// key string without ever touching each other's Journals.
	const sharedKey = "d-mfz3-shared"
	entryA := decodeEntry(t, createEntry(t, ts, tokenA, map[string]string{
		"date": "2026-08-19", "categoryId": categoryA, "content": "A 的紀錄",
		"idempotencyKey": sharedKey,
	}))
	entryB := decodeEntry(t, createEntry(t, ts, tokenB, map[string]string{
		"date": "2026-08-19", "categoryId": categoryB, "content": "B 的紀錄",
		"idempotencyKey": sharedKey,
	}))
	if entryB.ID == entryA.ID {
		t.Error("the same key crossed users and replayed another Journal's Entry")
	}
	if entriesA := listDay(t, ts, tokenA, "2026-08-19"); len(entriesA) != 1 {
		t.Errorf("user A holds %d entries, want 1", len(entriesA))
	}
	if entriesB := listDay(t, ts, tokenB, "2026-08-19"); len(entriesB) != 1 {
		t.Errorf("user B holds %d entries, want 1", len(entriesB))
	}
}
