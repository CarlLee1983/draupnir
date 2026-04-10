# Security & Sanitization

Prism provides built-in protection against XSS (Cross-Site Scripting) attacks.

## 1. Automatic Escaping

By default, all variables using the `{{ }}` syntax are HTML-escaped.

```handlebars
{{ userInput }} {{-- Safe: <script> becomes &lt;script&gt; --}}
```

## 2. Raw Output

Only use triple braces `{{{ }}}` or `{!! !!}` for content you trust completely.

```handlebars
{!! trustedHtml !!} {{-- Unescaped --}}
```

## 3. The `{{sanitize}}` Helper

Use this for user-generated content that *should* contain some HTML (e.g., from a rich text editor).

```handlebars
{{sanitize html=userComment mode="default"}}
```

### Sanitization Modes

| Mode | Allowed Tags | Use Case |
|---|---|---|
| `default` | `p, br, strong, em, b, i, ul, ol, li` | Standard rich text. |
| `strict` | `strong, em, b, i, br` | Minimal formatting. |
| `strip` | None | Plain text only. |

## 4. Programmatic Sanitization

```typescript
import { sanitizeHtml, stripHtmlTags } from '@gravito/prism'

const clean = sanitizeHtml(unsafeInput)
const plainText = stripHtmlTags(htmlContent)
```

## 5. Blocked Elements

The sanitizer always removes:
- `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`
- `on*` event handlers (`onclick`, `onerror`, etc.)
- `javascript:`, `data:`, `vbscript:` URI schemes
