/**
 * Migration: 建立 api_keys
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateApiKeysTable implements Migration {
	async up(): Promise<void> {
		await Schema.create('api_keys', (table) => {
			table.string('id').primary()
			table.string('org_id')
			table.string('created_by_user_id')
			table.string('label')
			table.string('key_hash').unique()
			table.string('bifrost_virtual_key_id')
			table.string('status').default('active')
			table.text('scope')
			table.timestamp('expires_at').nullable()
			table.timestamp('revoked_at').nullable()
			table.timestamps()
		})
	}

	async down(): Promise<void> {
		await Schema.dropIfExists('api_keys')
	}
}
