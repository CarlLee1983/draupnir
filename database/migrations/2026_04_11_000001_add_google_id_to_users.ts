/**
 * Migration: add nullable unique google_id for Google OAuth account linking.
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddGoogleIdToUsers implements Migration {
  async up(): Promise<void> {
    await Schema.table('users', (table) => {
      table.string('google_id').nullable()
      table.unique('google_id', 'users_google_id_unique')
    })
  }

  async down(): Promise<void> {
    await Schema.table('users', (table) => {
      table.dropIndex('users_google_id_unique')
      table.dropColumn('google_id')
    })
  }
}
