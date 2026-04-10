# Chromatic — Terminal Styling

`@gravito/chromatic` is a high-performance terminal styling library used across the Gravito ecosystem.

## 1. Simple Coloring

Use the `Painter` static methods for quick styling.

```typescript
import { Painter } from '@gravito/chromatic'

Painter.red('Red text')
Painter.bgBlue('Blue background')
Painter.bold('Bold text')
Painter.italic('Italic text')
```

## 2. Semantic Colors

`Chromatic` provides semantic methods that adapt to the current theme.

```typescript
import { Chromatic } from '@gravito/chromatic'

Chromatic.success('Success') // usually green
Chromatic.warning('Warning') // usually yellow
Chromatic.error('Error')     // usually red
Chromatic.info('Info')       // usually blue/cyan
Chromatic.primary('Primary') // theme primary color
```

## 3. Style Builder

For complex combinations, use the fluent builder API.

```typescript
const output = Painter.create('Attention!')
  .bold()
  .underline()
  .fg('#FFA500') // Hex support
  .bg('black')
  .build()
```

## 4. Themes

You can register and switch themes globally.

```typescript
import { ThemeManager, darkTheme, lightTheme } from '@gravito/chromatic'

const tm = ThemeManager.getInstance()
tm.register(darkTheme)
tm.setCurrentTheme('dark')
```

## 5. Terminal Capabilities

Chromatic automatically detects terminal support (Color depth, TTY, etc.).

```typescript
const caps = Painter.getCapabilities()
if (caps.hasColor) { ... }
console.log(`Support: ${caps.colorSupport}`) // 'none' | 'basic' | 'ansi16' | 'ansi256' | 'truecolor'
```
