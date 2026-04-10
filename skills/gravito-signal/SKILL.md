---
name: gravito-signal
description: Guidance for using @gravito/signal. Use when building mail flows, Mailable classes, transport configuration, dev-mode mail previews, or mail rendering in Gravito projects.
---

# @gravito/signal

`@gravito/signal` is Gravito's mail package. Use it when the task is about sending transactional email or configuring mail transports.

## Decision tree

```text
Need bootstrap or transport config?
  -> references/setup.md

Need Mailable classes or rendering?
  -> references/mailable.md

Need template/react/html renderer details?
  -> references/renderers.md

Need dev preview or transport selection?
  -> references/preview.md

Need transport-specific behavior or delivery rules?
  -> references/transports.md

Need send-time workflow, error handling, or testing?
  -> references/workflow.md

Need notification-style mail examples or project-specific rules?
  -> references/draupnir-patterns.md

Need message composition recipes?
  -> references/message-recipes.md
```

## Core exports

```typescript
import { SignalOrbit, Mailable } from '@gravito/signal'
import type { IMail } from '@gravito/signal'
```

## Minimal workflow

1. Configure the mail orbit once at bootstrap.
2. Encapsulate each message in a `Mailable` class.
3. Send mail through `IMail`; do not scatter transport-specific code in controllers.
4. Use dev mode or a memory transport in local development.

## Common pitfalls

- Do not construct raw SMTP calls in feature code.
- Keep templates and message builders deterministic and testable.
- Never enable production transports implicitly in local development.
- If a flow needs notifications as well as mail, keep mail logic inside Signal and orchestration elsewhere.

## References

- `references/setup.md`
- `references/mailable.md`
- `references/renderers.md`
- `references/preview.md`
- `references/transports.md`
- `references/workflow.md`
- `references/draupnir-patterns.md`
- `references/message-recipes.md`
