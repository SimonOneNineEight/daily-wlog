package config_test

import (
	"testing"

	"github.com/SimonOneNineEight/daily-wlog/api/internal/config"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func TestLoadReadsEnvironment(t *testing.T) {
	cfg, err := config.Load(env(map[string]string{
		"DATABASE_URL": "postgresql://db/example",
		"PORT":         "9090",
		"SENTRY_DSN":   "https://key@sentry.example/1",
	}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Addr != ":9090" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":9090")
	}
	if cfg.DatabaseURL != "postgresql://db/example" {
		t.Errorf("DatabaseURL = %q, want the env value", cfg.DatabaseURL)
	}
	if cfg.SentryDSN != "https://key@sentry.example/1" {
		t.Errorf("SentryDSN = %q, want the env value", cfg.SentryDSN)
	}
}

func TestLoadDefaultsPortTo8080(t *testing.T) {
	cfg, err := config.Load(env(map[string]string{"DATABASE_URL": "postgresql://db/example"}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Addr != ":8080" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":8080")
	}
}

func TestLoadRequiresDatabaseURL(t *testing.T) {
	if _, err := config.Load(env(nil)); err == nil {
		t.Fatal("Load succeeded without DATABASE_URL, want an error")
	}
}
