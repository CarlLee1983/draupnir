import { joinPath } from '../src/Website/Http/Routing/routePath'

// Force environment setup
const envPath = joinPath(process.cwd(), '.env')
try {
  const file = Bun.file(envPath)
  if (await file.exists()) {
    const envContent = await file.text()
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) process.env[key.trim()] = value.trim()
    })
  }
} catch (e) {}

/**
 * Email: admin@draupnir.local
 * Password: Admin123456
 * Role: admin
 *
 * Usage:
 *   bun scripts/seed-admin.ts
 *   bun scripts/seed-admin.ts --force   # delete existing admin@draupnir.local then insert (dev only)
 */

// Ensure ORM is atlas for Postgres compatibility
process.env.ORM = 'atlas'

import { bootstrap } from '../src/bootstrap'
import { User, UserStatus } from '../src/Modules/Auth/Domain/Aggregates/User'
import { Email } from '../src/Modules/Auth/Domain/ValueObjects/Email'
import { Password } from '../src/Modules/Auth/Domain/ValueObjects/Password'
import { Role } from '../src/Modules/Auth/Domain/ValueObjects/Role'
import { UserRegistered } from '../src/Modules/Auth/Domain/Events/UserRegistered'
import { DomainEventDispatcher } from '../src/Shared/Domain/DomainEventDispatcher'
import type { IAuthRepository } from '../src/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IPasswordHasher } from '../src/Modules/Auth/Application/Ports/IPasswordHasher'

async function run() {
  const force = process.argv.includes('--force')
  console.log('🚀 Seeding admin user...')

  try {
    // 1. Bootstrap the application core
    const core = await bootstrap()
    const container = core.container

    const authRepo = container.make('authRepository') as IAuthRepository
    const passwordHasher = container.make('passwordHasher') as IPasswordHasher

    const adminEmail = new Email('admin@draupnir.local')
    const adminPasswordPlain = 'Admin123456'

    // 2. If admin exists: skip, or delete first when --force (this script always uses random UUIDs)
    const existing = await authRepo.findByEmail(adminEmail)
    if (existing) {
      if (force) {
        console.log('⚠️ Removing existing admin@draupnir.local (--force)...')
        await authRepo.delete(existing.id)
      } else {
        console.log('⚠️ Admin user already exists. Skipping...')
        console.log(`   Existing id: ${existing.id}`)
        console.log('   To replace: bun scripts/seed-admin.ts --force')
        process.exit(0)
      }
    }
    
    // 3. Create Admin User
    const userId = crypto.randomUUID()
    const hashedPassword = await passwordHasher.hash(adminPasswordPlain)
    const now = new Date()
    const adminUser = User.create(
      userId,
      adminEmail,
      Password.fromHashed(hashedPassword),
      Role.admin(),
      UserStatus.ACTIVE,
      now,
      now,
    )
    
    // 4. Save to database
    await authRepo.save(adminUser)
    console.log(`✅ Admin user created: ${adminEmail.getValue()} (id: ${userId})`)
    
    // 5. Dispatch UserRegistered event
    // This triggers Profile creation in the Profile module
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatch(new UserRegistered(adminUser.id, adminUser.emailValue))
    console.log('✅ UserRegistered event dispatched (Profile should be created)')
    
    console.log('\n--- Admin Credentials ---')
    console.log(`Email:    ${adminEmail.getValue()}`)
    console.log(`Password: ${adminPasswordPlain}`)
    console.log('--------------------------\n')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    process.exit(1)
  }
}

run()
