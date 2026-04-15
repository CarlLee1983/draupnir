/**
 * Migration: 建立 contracts（組織建立後 ProvisionOrganizationDefaults 會寫入預設合約）
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class CreateContractsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('contracts', (table) => {
      table.string('id').primary()
      table.string('target_type')
      table.string('target_id')
      table.string('status')
      table.text('terms')
      table.string('created_by')
      table.timestamps()

      table.index(['target_id', 'status'])
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('contracts')
  }
}
