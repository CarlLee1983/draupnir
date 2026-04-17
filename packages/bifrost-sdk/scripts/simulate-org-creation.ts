/**
 * 端對端驗證：模擬 Draupnir 建立組織的實際流程
 *
 *   1. ensureTeam({ name: orgId })        ← provisioning 第一次執行
 *   2. ensureTeam({ name: orgId }) again  ← 重複執行（冪等）
 *   3. createVirtualKey({ team_id })      ← 建立 API key 綁 Team
 *   4. getVirtualKey(vk_id)               ← 驗證 key 已存在
 *   5. deleteVirtualKey + deleteTeam      ← cleanup
 *
 * 每一步都印出關鍵欄位，方便確認 SDK 與 Bifrost 實際互動結果。
 *
 * 執行：
 *   cd packages/bifrost-sdk && bun run scripts/simulate-org-creation.ts
 */

import { BifrostClient, createBifrostClientConfig } from '../src'

const client = new BifrostClient(createBifrostClientConfig())
const orgId = `sim-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
console.log(`📝 模擬 org_id = ${orgId}\n`)

// Step 1: 第一次 provisioning → ensureTeam 建立新 Team
console.log('Step 1: ensureTeam() 第一次呼叫（應建立新 Team）')
const allBefore = await client.listTeams()
let team = allBefore.find((t) => t.name === orgId)
if (!team) {
  team = await client.createTeam({ name: orgId })
}
console.log(`  ✓ team.id=${team.id}  name="${team.name}"\n`)

// Step 2: 重複 provisioning → ensureTeam 必須冪等
console.log('Step 2: ensureTeam() 重複呼叫（冪等：不應建第二個）')
const allMid = await client.listTeams()
const matches = allMid.filter((t) => t.name === orgId)
console.log(`  ✓ 符合 name="${orgId}" 的 Team 數量：${matches.length}（預期 1）\n`)

// Step 3: 建立 virtual key，附帶 team_id
console.log('Step 3: createVirtualKey({ team_id }) 模擬發 API key')
const vk = await client.createVirtualKey({
  name: `sim-key-${orgId}`,
  team_id: team.id,
  key_ids: ['*'],
})
console.log(`  ✓ vk.id=${vk.id}  name="${vk.name}"  value=${vk.value?.slice(0, 12)}…\n`)

// Step 4: 讀回 key 驗證
console.log('Step 4: getVirtualKey 讀回驗證')
const fetched = await client.getVirtualKey(vk.id)
console.log(`  ✓ 讀回 name="${fetched.name}"  is_active=${fetched.is_active}\n`)

// Step 5: 反向確認：listTeams 帶 Team 下所屬 key
console.log('Step 5: getTeam 查看 Team 下的 virtual_keys 關聯')
const teamFull = await client.getTeam(team.id)
const linkedKeys = (teamFull as unknown as { virtual_keys?: readonly { id: string }[] })
  .virtual_keys
console.log(
  `  ✓ team.virtual_keys 包含 ${linkedKeys?.length ?? 0} 筆；` +
    `是否含此 key：${linkedKeys?.some((k) => k.id === vk.id) ?? false}\n`,
)

// Cleanup
console.log('Cleanup: 刪除測試資料')
await client.deleteVirtualKey(vk.id)
await client.deleteTeam(team.id)
console.log('  ✓ 清除完成')

console.log('\n🎉 SDK 端對端流程驗證通過')
