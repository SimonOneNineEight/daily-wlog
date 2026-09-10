# Build a static API binary; the runtime image carries only the binary and CA
# certificates (needed for Sentry's TLS connection).
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bin/api ./cmd/api
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bin/purge ./cmd/purge

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/api /api
# The purge binary rides along so a Cloud Run Job can run it from the same
# image (job overrides the command to /purge).
COPY --from=build /bin/purge /purge
ENTRYPOINT ["/api"]
