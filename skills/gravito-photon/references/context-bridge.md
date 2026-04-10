# Photon Context Bridge

This reference covers the boundary between `@gravito/core` context objects and Draupnir's framework-agnostic `IHttpContext`.

## Why this exists

Draupnir controllers do not depend on `GravitoContext` directly. They use `IHttpContext` so the application layer stays framework-agnostic.

## Bridge contract

`fromGravitoContext(ctx)` should expose:

- request body access through `getBodyText()`, `getJsonBody()`, and `getBody()`
- header access through `getHeader()`
- route params through `getParam()` and `params`
- query params through `getQuery()` and `query`
- response helpers `json()`, `text()`, and `redirect()`
- context storage via `get()` and `set()`

## Important behavior

- `getBody()` is an alias of `getJsonBody()`.
- Header lookup should tolerate different casing.
- Param lookup should fall back to pathname parsing when the underlying router fails to populate params.
- Controllers should read `ctx.get('validated')` after `FormRequest` validation.

## Route adapter rules

The module router adapter should preserve framework behavior:

- plain handler routes should run through the middleware pipeline
- `FormRequest` routes should be passed directly to the core router
- middleware + `FormRequest` should keep middleware first, validation second, controller last

## Common bridge mistakes

- Casting `GravitoContext` directly in controllers instead of using the adapter interface.
- Losing the validated payload because the wrapper bypassed the core router's `FormRequest` handling.
- Assuming `ctx.params` is always populated; use fallback param resolution where needed.
