# Profile Locale Flow

`Draupnir` already persists locale on `UserProfile`.

## Current model

- `UserProfile.locale` stores the saved preference
- `Locale.default()` currently returns `zh-TW`
- valid locales are `zh-TW`, `en`, `ja`, and `ko`

## Recommended flow

1. read the saved profile locale
2. validate it with the `Locale` value object when updating
3. derive the request locale from profile + request context
4. expose the effective locale to page data

## Update example

```typescript
const nextProfile = profile.updateProfile({
  locale: new Locale('en').toString(),
})
```

## Request flow

1. user submits the locale in the profile form
2. `UpdateProfileRequest` accepts the raw string
3. `UpdateProfileService` validates it with `new Locale(request.locale)`
4. the aggregate stores the normalized locale string
5. shared data reads the updated locale on the next request

## Rules

- keep locale validation in the domain layer
- keep locale selection logic in application or middleware layers
- do not scatter locale fallback rules across pages
