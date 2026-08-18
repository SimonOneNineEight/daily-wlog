# API in Go

The thin API from ADR-0002 is written in Go, not TypeScript. The deciding reason is deliberate
and personal: the builder wants to learn Go on this project, and that motivation outweighs the
single-language convenience a TS API would give — a reasonable reader would otherwise assume TS
(the app is React Native), so this records why not. Accepted cost: the app/API contract now
spans two languages, contained by making OpenAPI the contract's source of truth — `oapi-codegen`
generates the Go server stubs and `openapi-typescript` generates the app's client types, so
drift breaks builds instead of production. The API remains the thin, stateless coordination
layer of ADR-0002 (photo bytes bypass it entirely via presigned storage URLs; client-side
re-encode), so Go's learning curve lands on a small, well-bounded surface.
