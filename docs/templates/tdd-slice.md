# TDD Slice

Use this before implementation for any non-trivial feature, bug fix, endpoint change, cross-module flow, or refactor.

Feature:

Primary user story:
As a [role]
I want to [action]
So that [business outcome]

## Given

- [ ]

## When

- [ ]

## Then

- [ ] Public result / HTTP response:
- [ ] DB state:
- [ ] Domain event:
- [ ] External fake observation, if any:
- [ ] Permission behavior:
- [ ] Validation behavior:
- [ ] Time / expiry behavior, if relevant:

## Tests

- [ ] Unit spec:
- [ ] Acceptance use case spec:
- [ ] API contract spec:
- [ ] Browser E2E, if browser-specific:

## Verification commands

```bash
bun test <unit-spec>
bun test <acceptance-spec>
bun test <api-contract-spec>
bun run typecheck
bun run lint
```

## Notes

- Mark non-applicable items as `N/A`; do not silently omit them.
- Do not mock internal repositories, application services, auth middleware, or validation.
- Fake only external/uncontrolled ports such as clock, mailer, webhook deliverer, scheduler, queue, or gateway.
