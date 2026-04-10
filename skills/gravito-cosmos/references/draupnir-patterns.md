# Draupnir Patterns

`Draupnir` already has a profile locale field and a shared Inertia page-data pipeline.

## Current signals

- `src/Modules/Profile/Domain/ValueObjects/Locale.ts`
- `src/Modules/Profile/Domain/Aggregates/UserProfile.ts`
- `src/Pages/SharedDataMiddleware.ts`
- `src/Pages/InertiaService.ts`

## Recommended flow

1. treat `UserProfile.locale` as the saved preference
2. derive an effective locale for the request
3. expose that locale to shared page data
4. use the same locale when formatting UI copy and flash messages

## Do not

- treat locale as a presentation-only concern
- duplicate locale defaults in every page
- let server-rendered and client-rendered pages disagree on language
