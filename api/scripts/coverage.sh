#!/usr/bin/env bash
# Run the API tests and enforce 100% statement coverage over internal
# packages. cmd/api/main.go is excluded: it is a logic-free shim (see its
# package comment); all behavior lives in internal/ where this gate sees it.
#
# -count=1 is load-bearing: cached test results replay coverage profiles that
# were instrumented against OLD source, and merging them with fresh profiles
# yields phantom uncovered blocks (locally after edits, on CI via setup-go's
# restored build cache). Forcing a rerun keeps every profile current.
set -euo pipefail
cd "$(dirname "$0")/.."

go test -count=1 -coverprofile=cover.out -coverpkg=./internal/... ./...

total=$(go tool cover -func=cover.out | awk '/^total:/ {print $3}')
if [ "$total" != "100.0%" ]; then
    echo "API statement coverage is $total; the gate requires 100.0%." >&2
    go tool cover -func=cover.out | grep -v '100.0%$' >&2
    exit 1
fi
echo "API statement coverage: $total"
