/**
 * Migration: add nullable unique google_id for Google OAuth account linking.
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddGoogleIdToUsers implements Migration {
  async up(): Promise<void> {
    await Schema.table('users', (table) => {
      table.string('google_id').nullable().unique()
    })
  }

  async down(): Promise<void> {
    await Schema.table('users', (table) => {
      table.dropColumn('google_id')
    })
  }
}
