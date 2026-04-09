/**
 * Migration: 建立 organizations、organization_members、organization_invitations
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateOrganizationTables implements Migration {
	async up(): Promise<void> {
		await Schema.create('organizations', (table) => {
			table.string('id').primary()
			table.string('name')
			table.string('slug').unique()
			table.string('description').nullable()
			table.string('status').default('active')
			table.timestamps()
		})

		await Schema.create('organization_members', (table) => {
			table.string('id').primary()
			table.string('organization_id')
			table.string('user_id')
			table.string('role').default('member')
			table.timestamp('joined_at')
			table.timestamp('created_at')
		})

		await Schema.create('organization_invitations', (table) => {
			table.string('id').primary()
			table.string('organization_id')
			table.string('email')
			table.string('token_hash').unique()
			table.string('role').default('member')
			table.string('invited_by_user_id')
			table.string('status').default('pending')
			table.timestamp('expires_at')
			table.timestamp('created_at')
		})
	}

	async down(): Promise<void> {
		await Schema.dropIfExists('organization_invitations')
		await Schema.dropIfExists('organization_members')
		await Schema.dropIfExists('organizations')
	}
}
