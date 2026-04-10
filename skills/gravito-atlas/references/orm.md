# Active Record ORM

Atlas ships a Laravel-style Active Record ORM: `Model` base class with decorator-defined columns and relationships, soft deletes, eager loading, factories, etc.

## Model basics

```typescript
import { Model, column, HasMany, BelongsTo, SoftDeletes } from '@gravito/atlas'

@SoftDeletes({ column: 'deleted_at' })
class User extends Model {
  static table = 'users'
  static primaryKey = 'id'
  static timestamps = true              // manages created_at + updated_at
  // static timestamps = 'created_only' // only created_at
  // static timestamps = false          // manage nothing

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ name: 'full_name' })   // maps to column 'full_name'
  declare fullName: string

  @column({ serializeAs: null })   // hidden from toJSON
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: Date

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: Date

  @column.dateTime()
  declare deletedAt: Date | null

  @HasMany(() => Post)
  declare posts: Post[]

  @BelongsTo(() => Organization)
  declare organization: Organization
}
```

### Static API

```typescript
// Create + save
const u = await User.create({ email: 'a@x.com', fullName: 'Alice' })

// Build without saving
const u = User.make({ email: 'a@x.com' })
await u.save()

// Find
const u = await User.find(1)             // User | null
const u = await User.findOrFail(1)       // throws ModelNotFoundError

// Query
const active = await User.where('status', 'active').orderBy('created_at', 'desc').get()
const first  = await User.where('email', email).first()

// With relationships (eager load)
const users = await User.with('posts').get()
const user  = await User.with(['posts', 'organization']).find(1)

// Count / exists
await User.count()
await User.exists()

// Iterate large tables memory-safely
for await (const chunk of User.lazyAll(500)) { /* raw attrs */ }
for await (const chunk of User.cursor(500))  { /* hydrated models */ }
```

### Instance API

```typescript
const u = await User.find(1)
u.email = 'new@x.com'
console.log(u.isDirty)       // true
console.log(u.getDirty())    // { email: 'new@x.com' }
await u.save()               // persists only the dirty diff

await u.delete()             // soft delete if @SoftDeletes, else hard delete
await u.forceDelete()        // hard delete
await u.restore()            // restore soft-deleted
```

## Relationship decorators

Available on `Model` classes:

```typescript
@HasOne(() => Profile)
@HasMany(() => Post)
@BelongsTo(() => Organization)
@BelongsToMany(() => Role, { pivotTable: 'user_roles' })
@MorphOne(() => Image, 'imageable')
@MorphMany(() => Comment, 'commentable')
@MorphTo()
```

All relationship factories are `() => ModelClass` to sidestep circular imports.

Loading strategies:

```typescript
// Lazy (N+1 risk — Atlas has a built-in N+1 detector)
const u = await User.find(1)
const posts = await u.posts

// Eager load to avoid N+1
const users = await User.with('posts').get()
const users = await User.with({ posts: q => q.where('published', true) }).get()
```

## Lifecycle hooks

Models support several decorators for intercepting lifecycle events. All hooks receive the model instance.

```typescript
import { Model, column, beforeSave, afterCreate, beforeDelete } from '@gravito/atlas'

class User extends Model {
  @column({ isPrimary: true })
  declare id: string

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$isDirty('password')) {
      user.password = await hash(user.password)
    }
  }

  @afterCreate()
  static async welcomeEmail(user: User) {
    await sendWelcome(user.email)
  }

  @beforeDelete()
  static async cleanup(user: User) {
    await user.posts.delete()
  }
}
```

Supported hooks: `@beforeSave`, `@afterSave`, `@beforeCreate`, `@afterCreate`, `@beforeUpdate`, `@afterUpdate`, `@beforeDelete`, `@afterDelete`, `@afterFetch`, `@afterFind`.

## Best practices

### Repository pattern vs. Active Record

While Atlas provides a powerful Active Record ORM (`extends Model`), many Draupnir projects prefer a **Repository Pattern** with a manual mapping layer (using the Query Builder).

| Approach | Pattern | Pros | Cons |
|---|---|---|---|
| **Active Record** | `User.find(1)` | High productivity, less boilerplate. | Harder to swap ORM, logic leaks into Model. |
| **Repository** | `authRepo.findById(1)` | Clean domain models, testable, ORM-agnostic. | More boilerplate (mapping logic). |

In Draupnir, the Repository pattern is implemented using an `IDatabaseAccess` abstraction that wraps the Atlas Query Builder. This allows for in-memory implementations during unit tests.

### Relationship loading

Always prefer **Eager Loading** (`.with()`) over Lazy Loading to avoid N+1 query performance issues. Atlas includes a built-in detector that will warn you in development if it detects an N+1 query pattern.

## Seeders and factories

```typescript
import { Factory, SeederRunner, type Seeder } from '@gravito/atlas'

Factory.define(User, (faker) => ({
  email: faker.internet.email(),
  fullName: faker.person.fullName(),
}))

const seeder: Seeder = {
  async run() {
    await Factory.for(User).createMany(10)
  },
}

await SeederRunner.run([seeder])
```

Seeder files live under `database/seeders/` and are auto-discovered by `orbit seed`.

```bash
npx orbit seed
```

## Type generation

```bash
npx orbit generate:types
```

Reads the live DB schema and writes TypeScript types to a configured path.
