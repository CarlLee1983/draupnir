import { type Migration, Schema } from '@gravito/atlas'

export default class CreateActivityLogsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('activity_logs', (table) => {
      table.string('id').primary()
      table.string('user_id').index()
      table.string('action').index()
      table.string('target_id').index()
      table.json('metadata').nullable()
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('activity_logs')
  }
}
