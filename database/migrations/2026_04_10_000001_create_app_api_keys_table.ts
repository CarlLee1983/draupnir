/**
 * Migration: 建立 app_api_keys（應用層級 API Key）
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateAppApiKeysTable implements Migration {
	async up(): Promise<void> {
		await Schema.create('app_api_keys', (table) => {
			table.string('id').primary()
			table.string('org_id')
			table.string('issued_by_user_id')
			table.string('label')
			table.string('key_hash').unique()
			table.string('bifrost_virtual_key_id')
			table.string('status').default('pending')
			table.string('scope').default('read')
			table.text('rotation_policy')
			table.text('bound_modules').default('[]')
			table.string('previous_key_hash').nullable()
			table.string('previous_bifrost_virtual_key_id').nullable()
			table.timestamp('grace_period_ends_at').nullable()
			table.timestamp('expires_at').nullable()
			table.timestamp('revoked_at').nullable()
			table.timestamps()
		})
	}

	async down(): Promise<void> {
		await Schema.dropIfExists('app_api_keys')
	}
}
