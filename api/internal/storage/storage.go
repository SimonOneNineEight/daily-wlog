// Package storage is the API's client for Supabase Storage's REST surface:
// presigned uploads, batch-signed downloads, and object removal for the
// private photos bucket. Photo bytes never transit the API (ADR-0002) — this
// package only mints URLs and deletes objects.
package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const bucket = "photos"

type Client struct {
	baseURL   string
	secretKey string
	client    *http.Client
}

func New(baseURL, secretKey string) *Client {
	return &Client{
		baseURL:   baseURL,
		secretKey: secretKey,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

// do runs an authenticated storage request and decodes the JSON response
// into out (which may be nil to discard).
func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	// Kong needs the apikey header to exchange the secret key for a service
	// JWT; storage itself reads the Authorization header.
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	req.Header.Set("apikey", c.secretKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("storage %s %s responded %d", method, path, resp.StatusCode)
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// SignUpload mints a presigned upload URL for one object path, absolute from
// the client's point of view.
func (c *Client) SignUpload(ctx context.Context, path string) (string, error) {
	var result struct {
		URL string `json:"url"`
	}
	if err := c.do(ctx, http.MethodPost, "/object/upload/sign/"+bucket+"/"+path, struct{}{}, &result); err != nil {
		return "", err
	}
	return c.baseURL + result.URL, nil
}

// SignDownloads mints download URLs for every path, absolute, keyed by path.
// Any per-path failure is an error: a photo row whose object cannot be
// signed is a data-integrity problem, not a skippable row.
func (c *Client) SignDownloads(ctx context.Context, paths []string, expiresIn time.Duration) (map[string]string, error) {
	if len(paths) == 0 {
		return map[string]string{}, nil
	}
	var results []struct {
		Error     *string `json:"error"`
		Path      string  `json:"path"`
		SignedURL *string `json:"signedURL"`
	}
	body := map[string]any{"expiresIn": int(expiresIn.Seconds()), "paths": paths}
	if err := c.do(ctx, http.MethodPost, "/object/sign/"+bucket, body, &results); err != nil {
		return nil, err
	}
	urls := make(map[string]string, len(results))
	for _, r := range results {
		if r.Error != nil || r.SignedURL == nil {
			return nil, fmt.Errorf("storage could not sign %q", r.Path)
		}
		urls[r.Path] = c.baseURL + *r.SignedURL
	}
	return urls, nil
}

// Remove deletes objects; used for photo deletion and entry-cascade cleanup.
func (c *Client) Remove(ctx context.Context, paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	return c.do(ctx, http.MethodDelete, "/object/"+bucket, map[string]any{"prefixes": paths}, nil)
}
