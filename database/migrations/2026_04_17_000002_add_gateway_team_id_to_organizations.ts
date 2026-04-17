/**
 * Migration: organizations 新增 gateway_team_id 欄位
 *
 * 存放 Bifrost Team 的 UUID；由 ProvisionOrganizationDefaultsService 在
 * 組織建立後透過 gateway.ensureTeam 取得並寫回。NULL 代表尚未成功綁定 Team
 * （允許後續 provisioning 重跑時補寫）。建立 virtual key 時會以此值作為 team_id。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddGatewayTeamIdToOrganizations implements Migration {
  async up(): Promise<void> {
    await Schema.table('organizations', (table) => {
      table.string('gateway_team_id').nullable()
      table.index('gateway_team_id')
    })
  }

  async down(): Promise<void> {
    await Schema.table('organizations', (table) => {
      table.dropIndex('gateway_team_id')
      table.dropColumn('gateway_team_id')
    })
  }
}
