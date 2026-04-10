# Validation

Use localized messages for form validation and profile updates.

## Update profile example

`UpdateProfileRequest` currently accepts `locale` as a plain string. Keep parsing in the request
layer and validation in the domain layer.

```typescript
if (request.locale !== undefined) {
  new Locale(request.locale)
}
```

## Error strategy

- validation rules should fail with stable error keys
- messages should be resolved from the active locale
- domain validation should still throw for invalid state

## Example message keys

- `validation.locale.invalid`
- `validation.locale.unsupported`
- `validation.profile.displayName.required`

## Rules

- do not hard-code human-readable copy inside schema definitions when a translation catalog exists
- do not return mixed-language validation output
- do not let one form use a different locale source than the rest of the page
