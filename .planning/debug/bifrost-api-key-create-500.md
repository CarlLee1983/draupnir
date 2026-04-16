---
slug: bifrost-api-key-create-500
status: investigating
trigger: 建立 API Key 失敗：Bifrost API error 500 on /api/governance/virtual-keys POST request failed
created: 2026-04-16
updated: 2026-04-16
---

## Symptoms

- **Expected**: API Key 成功建立
- **Actual**: 建立 API Key 失敗，錯誤訊息：Bifrost API error 500 on /api/governance/virtual-keys: POST request failed
- **Environment**: 本地開發環境
- **Timeline**: 不確定何時開始，可能與近期 BifrostGatewayAdapter / bifrost-sdk 程式碼變更有關

## Current Focus

hypothesis: BifrostGatewayAdapter.createKey 現在無條件傳送 `provider_configs: [{ provider: '*' }]`，而 Bifrost governance API 不接受 provider 欄位為通配符 `'*'`，導致 500 錯誤
test: 比對 git diff 確認 provider_configs 的條件式送出改為無條件送出，且 provider 值為 `'*'` 非合法 provider 名稱
expecting: provider_configs 中的 provider 欄位必須是真實 provider 名稱（如 `openai`、`anthropic`），或者完全省略 provider_configs 讓 Bifrost 使用預設值
next_action: 修正 createKey 中的 provider_configs 預設邏輯 — 若無 providerConfigs 則省略整個欄位，不要注入 `[{ provider: '*' }]`

## Evidence

- timestamp: 2026-04-16T15:00:00Z
  checked: git diff HEAD -- src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts
  found: |
    createKey() 中的 provider_configs 邏輯從「有 providerConfigs 才送出」改為「無條件送出，預設為 [{ provider: '*' }]」。
    具體：
      舊: ...(request.providerConfigs !== undefined && { provider_configs: request.providerConfigs.map(...) })
      新: const providerConfigsWire = request.providerConfigs !== undefined ? ... : [{ provider: '*' }]
          並且直接寫 provider_configs: providerConfigsWire 到 createVirtualKey 呼叫
  implication: API key 建立時，因為 ApiKeyBifrostSync.createVirtualKey() 未傳入 providerConfigs，現在會送 `provider_configs: [{ provider: '*' }]` 到 Bifrost API

- timestamp: 2026-04-16T15:01:00Z
  checked: packages/bifrost-sdk/src/BifrostClient.ts 文件範例
  found: |
    BifrostClient 的 createVirtualKey 文件範例中，provider 是 'openai' 而非 '*'。
    BifrostProviderConfig 的 provider 欄位說明是 `"AI provider name (e.g., 'openai', 'anthropic')"` — 無任何說明支援 '*' 通配符
  implication: provider: '*' 是非法值，Bifrost API 會拒絕此請求

- timestamp: 2026-04-16T15:02:00Z
  checked: 同一個 diff 的程式碼注解
  found: |
    適配器自己的注解寫道：「Do not send `key_ids: ['*']` here — on many builds `key_ids` are concrete provider-key row IDs;
    a wildcard can surface as HTTP 500 instead of 422.」
    但程式碼卻對 provider 欄位做了相同的事：傳送通配符 `'*'`
  implication: 注意到 key_ids 通配符會導致 500，但在 provider_configs 的 provider 欄位做了同樣的事

- timestamp: 2026-04-16T15:03:00Z
  checked: ApiKeyBifrostSync.createVirtualKey() 呼叫路徑
  found: |
    ApiKeyBifrostSync.createVirtualKey(label, orgId, options?) 呼叫 gatewayClient.createKey({ name, customerId, budget? })
    — 完全不傳入 providerConfigs
    → 因此 BifrostGatewayAdapter 的 else branch 觸發，發出 provider_configs: [{ provider: '*' }]
  implication: 每次建立 API key 都會命中這個 bug，不只是部分情境

- timestamp: 2026-04-16T15:04:00Z
  checked: 舊版程式碼行為（git diff 中被移除的程式碼）
  found: |
    舊版：...(request.providerConfigs !== undefined && { provider_configs: ... })
    → 當 providerConfigs 未定義時，不傳送 provider_configs → Bifrost 使用其自身預設設定
    這才是正確行為，舊版是可運作的
  implication: 引入預設值 [{ provider: '*' }] 是造成回歸的根因

## Eliminated

- hypothesis: ManagerApiKeyCreatePage 表單驗證問題
  evidence: commit 48155c6 已修正 POST body 驗證（ManagerCreateApiKeyRequest），頁面層面正常
  timestamp: 2026-04-16T15:00:00Z

- hypothesis: bifrost-sdk 的 key_ids 通配符問題
  evidence: 新增 key_ids 欄位到 types.ts，但 BifrostGatewayAdapter 的注解明確說明不使用 key_ids: ['*']，且程式碼也確實沒有傳送 key_ids
  timestamp: 2026-04-16T15:01:00Z

- hypothesis: BIFROST_MASTER_KEY 認證問題（commit bb641c4）
  evidence: 這個 commit 讓 BIFROST_MASTER_KEY 成為可選的，但 500 錯誤發生在傳送無效 provider_configs 時，不是認證問題
  timestamp: 2026-04-16T15:02:00Z

## Resolution

root_cause: |
  BifrostGatewayAdapter.createKey() 在最新的未提交修改中，當 request.providerConfigs 未定義時，
  無條件傳送 provider_configs: [{ provider: '*' }] 到 Bifrost API。
  Bifrost governance API 的 provider 欄位不接受通配符 '*'（只接受真實 provider 名稱如 'openai'、'anthropic'），
  因此以 HTTP 500 回應。

  這個修改的本意是「不要 deny-by-default」，但實際上引入了更糟的問題：送出了 API 不接受的格式。

fix: |
  方案 A（最小修改，恢復舊行為）：
    移除 providerConfigsWire 變數及無條件注入的 provider_configs 欄位，
    恢復舊版的條件式 spread：
    ...(request.providerConfigs !== undefined && {
      provider_configs: request.providerConfigs.map((pc) => ({
        provider: pc.provider,
        ...(pc.allowedModels !== undefined && { allowed_models: [...pc.allowedModels] }),
      })),
    })

  方案 B（如果確實需要 allow-all 預設值）：
    使用真實 provider 名稱的清單作為預設值，而非通配符：
    [{ provider: 'openai' }, { provider: 'anthropic' }]
    但需確認 Bifrost 是否支援此清單格式。

  建議採用方案 A — 省略 provider_configs 讓 Bifrost 使用其自身預設設定是更安全的做法。

verification: 待修正後，手動建立 API key 確認不再得到 500 回應
files_changed:
  - src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts
