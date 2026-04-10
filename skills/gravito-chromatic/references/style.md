# Style Helpers

Use `Painter` for direct formatting when the exact style is known.

```typescript
import { Painter } from '@gravito/chromatic'

Painter.red('Red text')
Painter.bold('Bold text')
Painter.bold().underline().fg('#ff9900').build()
```

Prefer short, readable messages. Terminal output should help the operator scan state fast.
