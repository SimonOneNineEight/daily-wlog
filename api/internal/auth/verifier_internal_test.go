package auth

// Internal tests for cache behavior that the public Verify surface cannot
// steer: the refresh cooldown and rotated-key pruning need direct access to
// key() and the cooldown field. Claim validation lives in the external tests.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

// countingJWKS serves the given entries and counts fetches.
func countingJWKS(t *testing.T, entries *[]map[string]string, hits *atomic.Int32) *httptest.Server {
	t.Helper()
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": *entries})
	}))
	t.Cleanup(ts.Close)
	return ts
}

func entry(kid string) map[string]string {
	return map[string]string{"kty": "EC", "crv": "P-256", "kid": kid, "x": "AA", "y": "AA"}
}

func TestUnknownKidRespectsRefreshCooldown(t *testing.T) {
	var hits atomic.Int32
	entries := []map[string]string{}
	v := NewVerifier(countingJWKS(t, &entries, &hits).URL)

	if _, err := v.key(context.Background(), "nope"); err == nil {
		t.Fatal("key() found a kid the JWKS does not serve")
	}
	if _, err := v.key(context.Background(), "still-nope"); err == nil {
		t.Fatal("key() found a kid the JWKS does not serve")
	}
	if got := hits.Load(); got != 1 {
		t.Errorf("JWKS fetched %d times within the cooldown, want 1", got)
	}
}

func TestRefreshDropsRotatedKeys(t *testing.T) {
	var hits atomic.Int32
	entries := []map[string]string{entry("old")}
	v := NewVerifier(countingJWKS(t, &entries, &hits).URL)
	v.refreshCooldown = 0

	if _, err := v.key(context.Background(), "old"); err != nil {
		t.Fatalf("key(old): %v", err)
	}

	entries = []map[string]string{entry("new")}
	if _, err := v.key(context.Background(), "new"); err != nil {
		t.Fatalf("key(new) after rotation: %v", err)
	}
	if _, err := v.key(context.Background(), "old"); err == nil {
		t.Fatal("key(old) still trusted after it was rotated out of the JWKS")
	}
}

func TestRefreshRejectsNon200(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(ts.Close)
	v := NewVerifier(ts.URL)

	if _, err := v.key(context.Background(), "any"); err == nil {
		t.Fatal("key() succeeded against a failing JWKS endpoint")
	}
}
