# Hooks & Events

`@gravito/core` provides two systems for decoupling logic: **Hooks** (WordPress-style filters and actions) and **Events** (Event-driven architecture with listeners).

## HookManager (Actions & Filters)

Accessible via `core.hooks`. Used for synchronous transformation (filters) or side effects (actions).

### Filters

Filters allow you to transform a value through a chain of callbacks. Each callback **must** return the modified value.

```typescript
// Register a filter
core.hooks.addFilter<string>('content:render', async (content, args) => {
  return content.replace('bad-word', '***')
})

// Apply filters
const finalContent = await core.hooks.applyFilters('content:render', rawContent, { user: ctx.get('user') })
```

### Actions

Actions trigger side effects at specific points. They don't return values.

```typescript
// Register an action
core.hooks.addAction('user:created', async (user) => {
  await sendWelcomeEmail(user)
})

// Trigger an action
await core.hooks.doAction('user:created', newUser)

// Trigger an action asynchronously (distributed queue if configured)
await core.hooks.doActionAsync('order:paid', order, { priority: 'high' })
```

---

## EventManager (Events & Listeners)

Accessible via `core.events`. Used for structured, class-based event handling.

### Basic Usage

Define events by extending `Event` and listeners by implementing `Listener`.

```typescript
import { Event, type Listener } from '@gravito/core'

class UserRegistered extends Event {
  constructor(public user: User) { super() }
}

class SendWelcomeEmail implements Listener<UserRegistered> {
  async handle(event: UserRegistered): Promise<void> {
    // Logic here
  }
}

// Register listener
core.events.listen(UserRegistered, SendWelcomeEmail)

// Dispatch event
await core.events.dispatch(new UserRegistered(user))
```

### Differences

| Feature | Hooks | Events |
|---------|-------|--------|
| **Pattern** | Key-based (strings) | Class-based (types) |
| **Return Value** | Filters return values | Listeners return `void` |
| **Coupling** | Very loose (string keys) | Type-safe (class references) |
| **Best Use** | Plugin systems, content transformation | Domain events, complex async workflows |
