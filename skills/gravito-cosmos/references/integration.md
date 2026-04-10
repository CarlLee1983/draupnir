# Integration

Keep server and client localization behavior aligned.

Rules:

- expose the active locale through shared page data or shared request state
- reuse the same message keys on the server and client
- avoid duplicating locale detection logic in multiple layers

If a page is rendered through Inertia, send locale-sensitive props from the server instead of rebuilding them in the component.
