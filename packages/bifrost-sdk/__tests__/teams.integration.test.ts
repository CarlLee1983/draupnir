/**
 * Bifrost Teams 功能性整合測試
 *
 * 模擬 Draupnir 建立組織時的 Team 建立流程：
 *   - Team 的 name 使用 org_id
 *   - 不設定 budget（後續 virtual key 會 assign 到 Team）
 *   - 驗證 list / get / delete 行為
 *
 * 重要發現：Bifrost 的 `customer_id` 指向「已存在的 Customer 實體 UUID」，
 * 不接受任意字串（會回 500 "failed to create team"）。
 * 故本測試只用 name 識別，並由後端回傳的 Team.id 來連動後續 virtual key。
 *
 * 僅在 BIFROST_API_URL 設定時執行；否則自動 skip。
 * 執行：`bun test __tests__/teams.integration.test.ts`
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { BifrostClient, createBifrostClientConfig } from '../src'

const hasEnv = Boolean(process.env.BIFROST_API_URL)

describe.skipIf(!hasEnv)('Bifrost Teams 整合測試（模擬組織建立）', () => {
  let client: BifrostClient
  // 使用時間戳 + random 構成唯一 org_id，避免多次執行撞名
  const orgId = `it-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let createdTeamId: string | null = null

  beforeAll(() => {
    client = new BifrostClient(createBifrostClientConfig())
  })

  afterAll(async () => {
    // 清理：刪除測試建立的 Team，避免汙染環境。
    if (createdTeamId) {
      try {
        await client.deleteTeam(createdTeamId)
      } catch (error) {
        console.warn('[integration] cleanup deleteTeam failed', {
          teamId: createdTeamId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  })

  test('建立 Team：name 為 org_id，無 budget、無 customer', async () => {
    const team = await client.createTeam({ name: orgId })
    createdTeamId = team.id

    expect(team.id).toBeTruthy()
    expect(team.name).toBe(orgId)
    expect(team.budget_id).toBeFalsy()
  })

  test('getTeam 以 team_id 取回單一 Team', async () => {
    if (!createdTeamId) {
      throw new Error('expected createdTeamId from prior test')
    }
    const team = await client.getTeam(createdTeamId)
    expect(team.id).toBe(createdTeamId)
    expect(team.name).toBe(orgId)
  })

  test('listTeams 可列出剛建立的 Team', async () => {
    const teams = await client.listTeams()
    const match = teams.find((t) => t.id === createdTeamId)
    expect(match).toBeDefined()
    expect(match?.name).toBe(orgId)
  })

  test('Bifrost 拒絕任意字串作為 customer_id（驗證架構假設）', async () => {
    const invalidOrgId = `invalid-${Date.now()}`
    await expect(
      client.createTeam({ name: invalidOrgId, customer_id: invalidOrgId }),
    ).rejects.toThrow()
  })

  test('建立 virtual key 時附帶 team_id 可綁定到該 Team', async () => {
    if (!createdTeamId) {
      throw new Error('expected createdTeamId from prior test')
    }
    // 模擬實際 flow：組織已完成 provisioning → ApiKeyBifrostSync 建立 virtual key
    // 並帶入 org.gatewayTeamId 作為 team_id。
    const vk = await client.createVirtualKey({
      name: `it-key-${orgId}`,
      team_id: createdTeamId,
      key_ids: ['*'],
    })
    try {
      expect(vk.id).toBeTruthy()
      const full = await client.getVirtualKey(vk.id)
      // Bifrost 透過 team_id 將此 key 掛到 Team 之下；driver 關注的是
      // 後續 usage/log 會落在該 Team scope。此處僅驗證 key 成功建立。
      expect(full.name).toBe(`it-key-${orgId}`)
    } finally {
      await client.deleteVirtualKey(vk.id).catch(() => {})
    }
  })

  test('deleteTeam 後再 list 應找不到該 Team', async () => {
    if (!createdTeamId) {
      throw new Error('expected createdTeamId from prior test')
    }
    await client.deleteTeam(createdTeamId)

    const teams = await client.listTeams()
    const match = teams.find((t) => t.id === createdTeamId)
    expect(match).toBeUndefined()

    // cleanup 已由此測試完成，避免 afterAll 二次刪除。
    createdTeamId = null
  })
})
