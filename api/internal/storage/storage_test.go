package storage

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// The happy paths run against real local Supabase Storage through the server
// suite; these unit tests drive the client's own error branches with fakes.

func fakeStorage(t *testing.T, status int, body string) *Client {
	t.Helper()
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(ts.Close)
	return New(ts.URL, "test-key")
}

func TestDoRejectsNon2xx(t *testing.T) {
	c := fakeStorage(t, http.StatusForbidden, `{"error":"nope"}`)
	if _, err := c.SignUpload(context.Background(), "a/b.jpg"); err == nil {
		t.Fatal("SignUpload accepted a 403")
	}
	if err := c.Remove(context.Background(), []string{"a/b.jpg"}); err == nil {
		t.Fatal("Remove accepted a 403")
	}
	if _, err := c.SignDownloads(context.Background(), []string{"a"}, time.Minute); err == nil {
		t.Fatal("SignDownloads accepted a 403")
	}
}

func TestDoRejectsBadJSON(t *testing.T) {
	c := fakeStorage(t, http.StatusOK, "not json")
	if _, err := c.SignUpload(context.Background(), "a/b.jpg"); err == nil {
		t.Fatal("SignUpload accepted unparsable JSON")
	}
}

func TestDoRejectsUnreachableHost(t *testing.T) {
	c := New("http://127.0.0.1:1", "test-key")
	if _, err := c.SignUpload(context.Background(), "a/b.jpg"); err == nil {
		t.Fatal("SignUpload reached an unreachable host")
	}
}

func TestDoRejectsInvalidURL(t *testing.T) {
	c := New("http://bad host/\x00", "test-key")
	if _, err := c.SignUpload(context.Background(), "a/b.jpg"); err == nil {
		t.Fatal("SignUpload accepted an invalid URL")
	}
}

func TestSignDownloadsPerPathError(t *testing.T) {
	c := fakeStorage(t, http.StatusOK, `[{"error":"missing","path":"a","signedURL":null}]`)
	if _, err := c.SignDownloads(context.Background(), []string{"a"}, time.Minute); err == nil {
		t.Fatal("SignDownloads accepted a per-path error")
	}
}

func TestEmptyInputsShortCircuit(t *testing.T) {
	// No server: empty inputs must not touch the network.
	c := New("http://127.0.0.1:1", "test-key")
	urls, err := c.SignDownloads(context.Background(), nil, time.Minute)
	if err != nil || len(urls) != 0 {
		t.Fatalf("empty SignDownloads = %v, %v", urls, err)
	}
	if err := c.Remove(context.Background(), nil); err != nil {
		t.Fatalf("empty Remove = %v", err)
	}
}

func TestDoRejectsUnmarshalableBody(t *testing.T) {
	c := New("http://127.0.0.1:1", "test-key")
	if err := c.do(context.Background(), http.MethodPost, "/x", func() {}, nil); err == nil {
		t.Fatal("do accepted an unmarshalable body")
	}
}
