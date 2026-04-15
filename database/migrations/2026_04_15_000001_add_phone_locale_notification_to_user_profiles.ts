/**
 * Migration: 補上 user_profiles 缺少的 phone、locale、notification_preferences 欄位
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddPhoneLocaleNotificationToUserProfiles implements Migration {
  async up(): Promise<void> {
    await Schema.table('user_profiles', (table) => {
      table.string('phone').nullable()
      table.string('locale').default('zh-TW')
      table.text('notification_preferences').default('{}')
    })
  }

  async down(): Promise<void> {
    await Schema.table('user_profiles', (table) => {
      table.dropColumn('notification_preferences')
    })
    await Schema.table('user_profiles', (table) => {
      table.dropColumn('locale')
    })
    await Schema.table('user_profiles', (table) => {
      table.dropColumn('phone')
    })
  }
}
