// Package config loads the API's runtime configuration from the environment.
package config

import "errors"

type Config struct {
	// Addr is the listen address, ":<PORT>" (default ":8080").
	Addr string
	// DatabaseURL is the Postgres connection string. Required.
	DatabaseURL string
	// SentryDSN enables Sentry error reporting when non-empty.
	SentryDSN string
}

// Load reads configuration through getenv (os.Getenv in production).
func Load(getenv func(string) string) (Config, error) {
	databaseURL := getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	port := getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Config{
		Addr:        ":" + port,
		DatabaseURL: databaseURL,
		SentryDSN:   getenv("SENTRY_DSN"),
	}, nil
}
