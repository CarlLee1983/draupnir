# Sentinel Authorization

Use `gate` for named abilities and `Policy` for model-centric permissions.

## Gates

```typescript
gate.define('edit-product', (user, product) => user.id === product.ownerId)
gate.define('delete-product', (user, product) => user.role === 'admin')
```

Use Gates for ad hoc rules or use cases that do not map cleanly to one model.

### Gate conventions

- Use stable ability names such as `edit-product`, `delete-product`, or `org.invite-member`.
- Pass the resource object into the gate so ownership and state checks stay local to the rule.
- Keep gate names close to business language, not controller names.

## Policies

```typescript
class ProductPolicy extends Policy {
  viewAny(user) {
    return true
  }

  update(user, product) {
    return user.role === 'admin' || user.id === product.ownerId
  }
}
```

Use Policies when the permission logic belongs to a model or aggregate.

### Policy conventions

- Prefer one policy per aggregate or model family.
- Match method names to CRUD verbs when possible: `viewAny`, `view`, `create`, `update`, `delete`.
- Keep policy methods pure and side-effect free.

## RBAC patterns

- Model role as data, not as hard-coded conditionals scattered across handlers.
- Keep role names stable and documented.
- Prefer combining role checks with ownership checks for sensitive actions.
- Use RBAC for broad capability grants and Gates or Policies for object-level decisions.

## Failure handling

```typescript
if (gate.denies(user, 'edit-product', product)) {
  return ctx.status(403).json({ error: 'Forbidden' })
}
```

Use explicit 403 responses for denied access and keep the denial path short.

## Context access

Authorization should generally happen after authentication has populated the current user.

```typescript
const user = ctx.get('user')
if (!user) return ctx.status(401).json({ error: 'Unauthorized' })

await ctx.auth.authorize('update', product)
```

Use 401 for missing identity and 403 for denied access.

## Common authorization mistakes

- Duplicating the same rule in controller, service, and model.
- Putting policy logic in route middleware when it belongs to the aggregate.
- Checking authorization before authentication is resolved.
- Treating 403 and 401 as interchangeable.
