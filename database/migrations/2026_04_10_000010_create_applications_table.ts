/**
 * Migration: 建立 applications（Developer Portal Application）
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateApplicationsTable implements Migration {
	async up(): Promise<void> {
		await Schema.create('applications', (table) => {
			table.string('id').primary()
			table.string('name')
			table.text('description')
			table.string('org_id')
			table.string('created_by_user_id')
			table.string('status').default('active')
			table.string('webhook_url').nullable()
			table.string('webhook_secret').nullable()
			table.text('redirect_uris').nullable()
			table.timestamps()
		})
	}

	async down(): Promise<void> {
		await Schema.dropIfExists('applications')
	}
}
