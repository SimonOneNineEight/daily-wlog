#!/usr/bin/env bash
# Run the API tests and enforce 100% statement coverage over internal
# packages. cmd/api/main.go is excluded: it is a logic-free shim (see its
# package comment); all behavior lives in internal/ where this gate sees it.
#
# If this reports phantom uncovered lines right after editing covered files
# (duplicate shifted blocks in cover.out), it is a Go build-cache artifact:
# run `go clean -cache -testcache` and rerun. CI builds cold and never hits it.
set -euo pipefail
cd "$(dirname "$0")/.."

go test -coverprofile=cover.out -coverpkg=./internal/... ./...

total=$(go tool cover -func=cover.out | awk '/^total:/ {print $3}')
if [ "$total" != "100.0%" ]; then
    echo "API statement coverage is $total; the gate requires 100.0%." >&2
    go tool cover -func=cover.out | grep -v '100.0%$' >&2
    exit 1
fi
echo "API statement coverage: $total"
