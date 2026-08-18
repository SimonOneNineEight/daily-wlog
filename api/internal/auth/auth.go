// Package auth verifies Supabase Auth access tokens against the project's
// JWKS and carries the verified user id through the request context. Tokens
// are ES256-signed by GoTrue (Supabase's asymmetric signing keys); the
// verifier trusts only keys published at the JWKS URL.
package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey struct{}

// Verifier checks access tokens against the Supabase Auth JWKS. Keys are
// fetched lazily on first use and refreshed whenever an unknown key id
// appears (Supabase key rotation publishes the new key before using it).
type Verifier struct {
	jwksURL         string
	client          *http.Client
	refreshCooldown time.Duration
	mu              sync.Mutex
	keys            map[string]*ecdsa.PublicKey
	lastRefresh     time.Time
}

func NewVerifier(jwksURL string) *Verifier {
	return &Verifier{
		jwksURL: jwksURL,
		client:  &http.Client{Timeout: 10 * time.Second},
		// Unknown kids are attacker-controlled, pre-auth input; the cooldown
		// caps how often they can force a network fetch.
		refreshCooldown: time.Minute,
		keys:            map[string]*ecdsa.PublicKey{},
	}
}

// Verify returns the token's subject: the Supabase Auth user id.
func (v *Verifier) Verify(ctx context.Context, tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString,
		func(t *jwt.Token) (any, error) {
			kid, _ := t.Header["kid"].(string)
			return v.key(ctx, kid)
		},
		jwt.WithValidMethods([]string{"ES256"}),
		jwt.WithAudience("authenticated"),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return "", err
	}
	sub, err := token.Claims.GetSubject()
	if err != nil || sub == "" {
		return "", errors.New("token has no subject")
	}
	return sub, nil
}

func (v *Verifier) key(ctx context.Context, kid string) (*ecdsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if key, ok := v.keys[kid]; ok {
		return key, nil
	}
	// Key rotation publishes the new key before signing with it, so a truly
	// new kid is rare; inside the cooldown an unknown kid fails without I/O.
	if time.Since(v.lastRefresh) >= v.refreshCooldown {
		v.lastRefresh = time.Now()
		if err := v.refresh(ctx); err != nil {
			return nil, err
		}
		if key, ok := v.keys[kid]; ok {
			return key, nil
		}
	}
	return nil, fmt.Errorf("no signing key %q in JWKS", kid)
}

// refresh fetches the JWKS and replaces the cached key set wholesale, so keys
// rotated out of the document stop being trusted. Caller holds the lock.
func (v *Verifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint responded %d", resp.StatusCode)
	}
	var jwks struct {
		Keys []struct {
			Kty string `json:"kty"`
			Crv string `json:"crv"`
			Kid string `json:"kid"`
			X   string `json:"x"`
			Y   string `json:"y"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}
	keys := map[string]*ecdsa.PublicKey{}
	for _, k := range jwks.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue
		}
		x, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil {
			continue
		}
		y, err := base64.RawURLEncoding.DecodeString(k.Y)
		if err != nil {
			continue
		}
		keys[k.Kid] = &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(x),
			Y:     new(big.Int).SetBytes(y),
		}
	}
	v.keys = keys
	return nil
}

// Middleware rejects requests without a valid access token, except for the
// listed public paths. 401 bodies use the contract's Error shape. Tokens are
// never logged.
func Middleware(v *Verifier, public map[string]bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if public[r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}
			token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok {
				unauthorized(w)
				return
			}
			userID, err := v.Verify(r.Context(), token)
			if err != nil {
				unauthorized(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), contextKey{}, userID)))
		})
	}
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "missing or invalid access token"})
}

// UserID returns the verified user id set by Middleware, or "" outside it.
func UserID(ctx context.Context) string {
	id, _ := ctx.Value(contextKey{}).(string)
	return id
}
