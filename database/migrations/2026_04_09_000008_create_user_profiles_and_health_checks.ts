/**
 * Migration: 建立 user_profiles 與 health_checks
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateUserProfilesAndHealthChecks implements Migration {
  async up(): Promise<void> {
    await Schema.create('user_profiles', (table) => {
      table.string('id').primary()
      table.string('user_id')
      table.string('display_name').nullable()
      table.string('avatar_url').nullable()
      table.text('bio').nullable()
      table.string('timezone').default('UTC')
      table.timestamps()
    })

    await Schema.create('health_checks', (table) => {
      table.string('id').primary()
      table.string('status')
      table.timestamp('timestamp')
      table.text('details').nullable()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('health_checks')
    await Schema.dropIfExists('user_profiles')
  }
}
