# Container — Dependency Injection

## Lifecycles

| Method | Behaviour | Use for |
|--------|-----------|---------|
| `singleton(key, factory)` | Created once, cached forever | DB connections, repositories, shared services |
| `bind(key, factory)` | New instance on every `make()` | Stateful per-call objects |
| `scoped(key, factory)` | New instance per HTTP request, auto-cleaned | Request-level caches, per-request services |
| `instance(key, obj)` | Register an already-created instance | Config values, pre-built singletons |

## Basic usage

```typescript
// Register
container.singleton('db', (c) => new DatabaseConnection())
container.bind('logger', (c) => new ConsoleLogger())
container.scoped('requestCache', (c) => new RequestProductCache())
container.instance('config', configObj)

// Resolve
const db = container.make<DatabaseConnection>('db')
const logger = container.make('logger')

// Check existence
if (container.has('db')) { ... }

// Forget cached singleton (keeps binding)
container.forget('db')

// Flush everything
container.flush()
```

## Type-safe resolution via ServiceMap augmentation

```typescript
// In your module's type declarations:
declare module '@gravito/core' {
  interface ServiceMap {
    db: IDatabaseAccess
    logger: Logger
  }
}

// Now make() is typed:
const db = container.make('db')  // typed as IDatabaseAccess
```

## Factory receives the container

```typescript
container.singleton('billingService', (c) => {
  const repo    = c.make('billingRepo') as IBillingRepo
  const mailer  = c.make('mailer') as IMailer
  return new BillingService(repo, mailer)
})
```

## Namespaced singletons (Lite Satellites)

```typescript
// Key becomes 'inline:my-plugin:service'
container.singletonInline('my-plugin', 'service', (c) => new PluginService())
```
