# Integration

Keep server and client localization behavior aligned.

Rules:

- expose the active locale through shared page data or shared request state
- reuse the same message keys on the server and client
- avoid duplicating locale detection logic in multiple layers

If a page is rendered through Inertia, send locale-sensitive props from the server instead of rebuilding them in the component.

## Draupnir pattern

This project already centralizes shared page data for Inertia. Add locale there as a shared prop
or shared request value so every page can read the same active locale.

Good places to connect localization:

- profile settings when the user changes preferred language
- shared page props for React pages
- flash messages and validation errors
- server-side email or notification content

## Avoid

- double-resolving locale in controllers and components
- mixing translated copy with route or authorization logic
- hard-coding `zh-TW` in UI code once locale support exists
