# Draupnir Patterns

This project already uses an explicit Inertia service instead of direct framework calls.

## Current flow

- `src/Pages/page-routes.ts` builds the `InertiaService`
- `src/Pages/SharedDataMiddleware.ts` injects shared props
- `src/Pages/InertiaService.ts` merges shared props and page props

## Why it matters

- page handlers stay focused on business data
- shared UI state stays centralized
- SSR/version behavior stays consistent across routes

## Do not

- duplicate shared prop assembly in page classes
- branch on Inertia headers inside page components
- leak build/version logic into individual pages
