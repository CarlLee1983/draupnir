/**
 * 驗證腳本（保留資料版本）：建立一組 Team + Virtual Key，**不做 cleanup**，
 * 讓使用者可以在 Bifrost UI 直接看到結果。
 *
 * 結束後請手動刪除，或跑 `scripts/cleanup-simulated.ts <prefix>` 清理。
 */

import { BifrostClient, createBifrostClientConfig } from '../src'

const client = new BifrostClient(createBifrostClientConfig())
const orgId = `sim-org-${Date.now()}`
console.log(`📝 orgId = ${orgId}\n`)

const team = await client.createTeam({ name: orgId })
console.log(`✓ Team 建立：id=${team.id}  name="${team.name}"`)

const vk = await client.createVirtualKey({
  name: `sim-key-${orgId}`,
  team_id: team.id,
  key_ids: ['*'],
})
console.log(`✓ Virtual Key 建立：id=${vk.id}  name="${vk.name}"`)

console.log('\n👉 請到 Bifrost UI 確認：')
console.log(`   Team:  ${team.name}`)
console.log(`   Key :  sim-key-${orgId}  (team_id=${team.id})`)
console.log('\n⚠️ 此資料不會自動 cleanup，需手動刪除：')
console.log(`   bun run scripts/cleanup-simulated.ts ${team.id} ${vk.id}`)
