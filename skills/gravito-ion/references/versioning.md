# Versioning

Ion uses a version string to decide when the browser should reload the page shell.

## Behavior

- if the client version matches the server version, return the page payload
- if the client version is stale, return `409`
- use `X-Inertia-Location` to point the browser at the current URL

## Draupnir checklist

- make the version string change when frontend assets change
- keep the version function deterministic
- test the stale-client path during release verification
- keep the HTML shell and JSON response in sync

## Failure mode

If you change frontend assets without changing the version, clients can keep an old page shell and
render against the wrong bundle. Treat versioning as part of deployment safety, not as an optional
detail.
