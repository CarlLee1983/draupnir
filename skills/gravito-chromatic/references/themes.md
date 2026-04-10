# Themes

Use `Chromatic` when you want semantic output that can follow a shared theme.

```typescript
import { Chromatic, ThemeManager, darkTheme } from '@gravito/chromatic'

Chromatic.success('Operation completed')
Chromatic.warning('Check configuration')
Chromatic.error('Request failed')

const themeManager = ThemeManager.getInstance()
themeManager.register(darkTheme)
themeManager.setCurrentTheme('dark')
```

Keep semantic names stable so downstream tools can swap themes without changing call sites.
