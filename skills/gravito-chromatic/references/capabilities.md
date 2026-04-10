# Capability Detection

Use capability checks before relying on rich terminal features.

```typescript
import { Painter } from '@gravito/chromatic'

const capabilities = Painter.getCapabilities()

if (capabilities.hasColor) {
  console.log('Color support: yes')
}
```

Prefer graceful degradation when the terminal does not support the requested style depth.
