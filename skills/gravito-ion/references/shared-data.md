# Shared Data

Shared data belongs in one layer above page components.

## Current Draupnir shape

`src/Pages/SharedDataMiddleware.ts` currently injects:

- `auth.user`
- `currentOrgId`
- `flash.success`
- `flash.error`

`src/Pages/InertiaService.ts` then merges the shared payload with page props.

## Recommended additions

- active locale
- active timezone if UI formatting needs it
- feature flags that should be available across many pages

## Rules

- keep shared data small
- keep request-specific values in request scope
- keep large data sets on the page route itself
- do not duplicate shared data in each page class
