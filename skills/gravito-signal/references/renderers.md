# Signal Renderers

Signal supports multiple renderers. Choose the renderer that matches the amount of structure and reuse you need.

## HTML renderer

Use HTML when the message is small or one-off.

```typescript
this.html('<h1>Welcome</h1><p>Your account is ready.</p>')
```

Best for:

- short transactional messages
- very simple templates
- messages where the HTML is already assembled elsewhere

## Template renderer

Use templates when the content needs shared layout, partials, or centralized markup.

```typescript
this.template('emails.order-confirm', {
  order: this.order,
  customer: this.order.customer,
})
```

Best for:

- reusable layouts
- multi-language content
- email content that should stay close to the view layer

## React renderer

Use React when the team already has React email components or wants componentized markup.

```typescript
this.react(OrderConfirmationEmail, { order: this.order })
```

Best for:

- complex emails with repeated sections
- design-heavy messages
- teams already using React for mail templates

## Renderer selection rules

- Keep renderer choice inside the `Mailable` implementation.
- Do not branch on renderer in controllers or services.
- Prefer the simplest renderer that satisfies the message complexity.
- Keep renderer data serializable and deterministic.

## Common renderer mistakes

- Using React for a tiny message that would be clearer as HTML.
- Embedding business logic directly in a template.
- Passing objects with hidden mutation or non-serializable state into a renderer.
- Mixing multiple renderer styles in the same message without a clear reason.
