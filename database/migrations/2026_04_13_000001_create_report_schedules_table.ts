import { type Migration, Schema } from '@gravito/atlas'

export default class CreateReportSchedulesTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('report_schedules', (table) => {
      table.string('id').primary()
      table.string('org_id').index()
      table.string('type') // weekly, monthly
      table.integer('day') // 0-6 or 1-31
      table.string('time') // HH:mm
      table.string('timezone')
      table.text('recipients') // JSON array
      table.boolean('enabled').default(true)
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('report_schedules')
  }
}
