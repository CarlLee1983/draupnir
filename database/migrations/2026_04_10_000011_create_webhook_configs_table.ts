/**
 * Migration: 建立 webhook_configs
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateWebhookConfigsTable implements Migration {
	async up(): Promise<void> {
		await Schema.create('webhook_configs', (table) => {
			table.string('id').primary()
			table.string('application_id')
			table.string('event_type')
			table.boolean('enabled').default(true)
			table.timestamps()
		})
	}

	async down(): Promise<void> {
		await Schema.dropIfExists('webhook_configs')
	}
}
