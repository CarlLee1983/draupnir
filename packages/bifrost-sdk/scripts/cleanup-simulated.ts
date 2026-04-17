/**
 * 刪除由 simulate-org-creation-no-cleanup.ts 建立的測試資料。
 *
 * 用法：
 *   bun run scripts/cleanup-simulated.ts <team_id> [<virtual_key_id> ...]
 */

import { BifrostClient, createBifrostClientConfig } from '../src'

const [, , teamId, ...vkIds] = process.argv
if (!teamId) {
  console.error('用法：bun run scripts/cleanup-simulated.ts <team_id> [<virtual_key_id> ...]')
  process.exit(1)
}

const client = new BifrostClient(createBifrostClientConfig())

for (const vkId of vkIds) {
  try {
    await client.deleteVirtualKey(vkId)
    console.log(`✓ Virtual Key 刪除：${vkId}`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn(`✗ 刪除 Virtual Key ${vkId} 失敗：${msg}`)
  }
}

try {
  await client.deleteTeam(teamId)
  console.log(`✓ Team 刪除：${teamId}`)
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error)
  console.warn(`✗ 刪除 Team ${teamId} 失敗：${msg}`)
}
