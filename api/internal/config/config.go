// Package config loads the API's runtime configuration from the environment.
package config

import "errors"

type Config struct {
	// Addr is the listen address, ":<PORT>" (default ":8080").
	Addr string
	// DatabaseURL is the Postgres connection string. Required.
	DatabaseURL string
	// SupabaseJWKSURL is where Supabase Auth publishes its signing keys.
	// Required: token verification fails closed without it.
	SupabaseJWKSURL string
	// SupabaseStorageURL is the storage REST base (…/storage/v1). Required.
	SupabaseStorageURL string
	// SupabaseSecretKey authenticates the API to storage. Required.
	SupabaseSecretKey string
	// SentryDSN enables Sentry error reporting when non-empty.
	SentryDSN string
}

// Load reads configuration through getenv (os.Getenv in production).
func Load(getenv func(string) string) (Config, error) {
	databaseURL := getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	jwksURL := getenv("SUPABASE_JWKS_URL")
	if jwksURL == "" {
		return Config{}, errors.New("SUPABASE_JWKS_URL is required")
	}
	storageURL := getenv("SUPABASE_STORAGE_URL")
	if storageURL == "" {
		return Config{}, errors.New("SUPABASE_STORAGE_URL is required")
	}
	secretKey := getenv("SUPABASE_SECRET_KEY")
	if secretKey == "" {
		return Config{}, errors.New("SUPABASE_SECRET_KEY is required")
	}
	port := getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Config{
		Addr:               ":" + port,
		DatabaseURL:        databaseURL,
		SupabaseJWKSURL:    jwksURL,
		SupabaseStorageURL: storageURL,
		SupabaseSecretKey:  secretKey,
		SentryDSN:          getenv("SENTRY_DSN"),
	}, nil
}
