# Flash Messages

Flash messages belong in shared page data so the next page can render them once.

## Current Draupnir behavior

- middleware stores `flash:success` and `flash:error`
- `InertiaService` merges them into the page payload
- React pages can render them from shared props

## Rules

- consume flash messages once, then clear them
- keep success and error messaging consistent
- do not bury flash state inside unrelated page props

## Example

```tsx
const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props

return (
  <>
    {flash.success ? <SuccessBanner text={flash.success} /> : null}
    {flash.error ? <ErrorBanner text={flash.error} /> : null}
  </>
)
```
