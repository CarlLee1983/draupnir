/**
 * 臨時驗證腳本：透過 SDK 列出目前 Bifrost 上的 Teams。
 *
 * 執行：
 *   cd packages/bifrost-sdk && bun run scripts/verify-teams.ts
 *
 * 需要環境變數 BIFROST_API_URL（可選 BIFROST_MASTER_KEY）。
 */

import { BifrostClient, createBifrostClientConfig } from '../src'

const client = new BifrostClient(createBifrostClientConfig())
const teams = await client.listTeams()
console.log(`目前 Team 數量：${teams.length}`)
for (const t of teams) {
  const cust = t.customer_id ?? '—'
  const budget = t.budget_id ?? '—'
  console.log(`  - ${t.id}  name="${t.name}"  customer_id=${cust}  budget_id=${budget}`)
}
