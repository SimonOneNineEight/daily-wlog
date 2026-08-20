package server_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func listColorRecents(t *testing.T, ts *httptest.Server, token string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/color-recents", nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /color-recents: %v", err)
	}
	return resp
}

func saveColorRecent(t *testing.T, ts *httptest.Server, token, color string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(map[string]string{"color": color})
	req, err := http.NewRequest(http.MethodPut, ts.URL+"/color-recents", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT /color-recents: %v", err)
	}
	return resp
}

func decodeColors(t *testing.T, resp *http.Response) []string {
	t.Helper()
	defer resp.Body.Close()
	var body struct {
		Colors []string `json:"colors"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode colors: %v", err)
	}
	return body.Colors
}

func TestColorRecentsRequireAToken(t *testing.T) {
	ts := newTestServer(t)
	checkStatus(t, listColorRecents(t, ts, ""), http.StatusUnauthorized)
	checkStatus(t, saveColorRecent(t, ts, "", "#123456"), http.StatusUnauthorized)
}

func TestColorRecentsStartEmpty(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	postMe(t, ts, token).Body.Close()

	resp := listColorRecents(t, ts, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if colors := decodeColors(t, resp); len(colors) != 0 {
		t.Errorf("fresh user has saved colors: %v", colors)
	}
}

func TestSaveColorRejectsNonHexValues(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	postMe(t, ts, token).Body.Close()

	for _, bad := range []string{"", "red", "#12345", "#1234567", "#GGGGGG", "123456"} {
		resp := saveColorRecent(t, ts, token, bad)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("color %q: status = %d, want 400", bad, resp.StatusCode)
		}
	}
}

func TestSavedColorsListMostRecentFirstAndPersist(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	postMe(t, ts, token).Body.Close()

	for _, color := range []string{"#111111", "#222222", "#333333"} {
		checkStatus(t, saveColorRecent(t, ts, token, color), http.StatusOK)
	}
	// Lowercase input is the same color canonicalized, not a new entry.
	resp := saveColorRecent(t, ts, token, "#aabb0c")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	want := []string{"#AABB0C", "#333333", "#222222", "#111111"}
	if got := decodeColors(t, resp); fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("save echo = %v, want %v", got, want)
	}

	// Persistence: a separate server over the same database sees the list.
	ts2 := newTestServer(t)
	if got := decodeColors(t, listColorRecents(t, ts2, token)); fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("persisted list = %v, want %v", got, want)
	}
}

func TestResavingAColorMovesItToTheFront(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	postMe(t, ts, token).Body.Close()

	for _, color := range []string{"#111111", "#222222", "#333333"} {
		checkStatus(t, saveColorRecent(t, ts, token, color), http.StatusOK)
	}
	resp := saveColorRecent(t, ts, token, "#111111")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	want := []string{"#111111", "#333333", "#222222"}
	if got := decodeColors(t, resp); fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("after re-save = %v, want %v (moved to front, no duplicate)", got, want)
	}
}

func TestSavedColorsCapAtTwelveEvictingTheOldest(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	postMe(t, ts, token).Body.Close()

	var saved []string
	for i := 1; i <= 13; i++ {
		color := fmt.Sprintf("#0000%02X", i)
		saved = append(saved, color)
		checkStatus(t, saveColorRecent(t, ts, token, color), http.StatusOK)
	}

	got := decodeColors(t, listColorRecents(t, ts, token))
	if len(got) != 12 {
		t.Fatalf("got %d colors, want the 12 cap: %v", len(got), got)
	}
	// Newest first; the very first color fell off the end.
	for i, want := range []string{saved[12], saved[11], saved[1]} {
		index := []int{0, 1, 11}[i]
		if got[index] != want {
			t.Errorf("colors[%d] = %q, want %q", index, got[index], want)
		}
	}
	for _, color := range got {
		if color == saved[0] {
			t.Errorf("oldest color %q survived the cap: %v", saved[0], got)
		}
	}
}
