# Admin 後台功能設計規格

**日期**：2026-04-16  
**狀態**：已核准，待實作  
**關聯規格**：[合約額度與 API Key 配發規格](../../draupnir/specs/2026-04-16-contract-quota-allocation-spec.md)

---

## 1. 背景與目標

系統已有三個角色（`admin` / `manager` / `member`）與完整 Admin 頁面骨架（Layout、路由、middleware），但存在三個缺口：

1. 登入後所有角色一律重導向 `/member/dashboard`，admin 無法直達 admin 區
2. 合約配額調整（`contractCap`）無對應 UI，儘管規格（§5）已定稿
3. API Key 用量欄位（`allocated / used / slack`）未在 admin 介面呈現

本設計以**漸進式增強方案**補齊這三個缺口，不動現有 member/manager 流程。

---

## 2. 範圍

| 功能 | 說明 |
|------|------|
| 登入分流 | admin 登入後導向 `/admin/dashboard`，其他角色保持 `/member/dashboard` |
| 合約配額調整 Modal | 在合約詳情頁調整 `contractCap`，含影響預覽與硬擋警告 |
| 組織合約彙總卡 | 組織詳情頁顯示 `contractCap / sumAllocated / unallocated` |
| API Key 用量明細 | `/admin/api-keys` 補充 `allocated / used / slack / resetPeriod / nextResetAt` |

**不在範圍**：
- 獨立 admin 登入頁（nginx IP 白名單由 infra 層處理）
- 預約生效的配額調降
- Manager 重配 UI（另案）

---

## 3. 設計細節

### 3.1 登入分流

**修改檔案**：`src/Website/Auth/Pages/LoginPage.ts`

登入成功後，依 `result.data.role` 決定重導向目標：

```
admin   → /admin/dashboard
manager → /member/dashboard
member  → /member/dashboard
```

Google OAuth 登入路徑（`src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts` 或 `oauth.routes.ts`）同步修改，確保 admin OAuth 登入亦導向 `/admin/dashboard`。

**不修改**：
- `requireAdmin` middleware（已正確回傳 403）
- 現有 admin / member 路由

---

### 3.2 合約配額調整 Modal

#### 3.2.1 UI 位置

`/admin/contracts/:id`（`ContractShow.tsx`）的右上角操作區，新增「調整配額」按鈕，與現有 activate / terminate 並列。

#### 3.2.2 Modal 結構

```
┌─────────────────────────────────────┐
│  調整合約配額                          │
├─────────────────────────────────────┤
│  現有上限：1,000 單位                  │
│  已配發總和：850 單位                  │
│  未分配池：150 單位                    │
├─────────────────────────────────────┤
│  新配額上限：[________]               │
├─────────────────────────────────────┤
│  影響預覽（即時計算）                   │
│  ┌──────────────────────────────┐   │
│  │ Key     配發前  配發後  差異  │   │
│  │ key-A   500    412   -88    │   │
│  │ key-B   350    288   -62    │   │
│  └──────────────────────────────┘   │
│  ⚠ key-C 調降後 allocated < used，   │
│    將進入硬擋狀態                      │
├─────────────────────────────────────┤
│                  [取消]  [確認調整]   │
└─────────────────────────────────────┘
```

#### 3.2.3 前端計算邏輯（依規格 §5.3）

輸入新 `contractCap` 時，前端即時計算：

1. 若 `newCap ≥ sumAllocated`：顯示「僅縮未分配池，各 Key 不受影響」
2. 若 `newCap < sumAllocated`：
   - `takeFromKeysTotal = sumAllocated - newCap`
   - 各 Key 新配發 = `round(allocated_i × newCap / sumAllocated)`
   - 加總誤差由最後一支 Key 吸收
3. 若任何 Key `allocated_new < used_i`：標紅該行，顯示硬擋警告（仍允許送出）

#### 3.2.4 後端端點

`POST /admin/contracts/:id/quota`，body：`{ newCap: number }`

後端執行：
1. 驗證 admin 身份（`requireAdmin`）
2. 執行 §5.3 比例縮減演算法（原子性）
3. 標記 `allocated < used` 的 Key 為硬擋狀態
4. 觸發 Manager 通知（§5.5）

#### 3.2.5 影響檔案

| 類型 | 檔案 |
|------|------|
| 新增前端元件 | `resources/js/Pages/Admin/Contracts/QuotaAdjustModal.tsx` |
| 修改 | `resources/js/Pages/Admin/Contracts/Show.tsx`（加按鈕 + Modal） |
| 新增 Page handler 方法 | `AdminContractDetailPage.postQuota()` |
| 新增 Application Service | `src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts` |
| 新增路由 | `registerAdminRoutes.ts`：`POST /admin/contracts/:id/quota` |

---

### 3.3 組織詳情頁合約彙總卡

**位置**：`/admin/organizations/:id`

在現有 org 詳情頁新增卡片：

```
┌─────────────────────────────────────┐
│  合約配額彙總                          │
├─────────────────────────────────────┤
│  合約上限        1,000 單位            │
│  已配發總和        850 單位            │
│  未分配池          150 單位            │
│  [████████░░]  85% 已配發             │
├─────────────────────────────────────┤
│  → 查看合約詳情   → 查看 API Keys      │
└─────────────────────────────────────┘
```

**影響檔案**：
- `src/Website/Admin/Pages/AdminOrganizationDetailPage.ts`：查詢 active contract，計算 `sumAllocated` 與 `unallocated`
- `resources/js/Pages/Admin/Organizations/Show.tsx`：新增彙總卡元件

---

### 3.4 API Key 用量明細

**位置**：`/admin/api-keys`（按組織篩選後）

現有欄位基礎上新增：

| 欄位 | 說明 |
|------|------|
| `allocated` | 配發額度上限 |
| `used` | 當期已用量 |
| `slack` | `max(0, allocated - used)` |
| `resetPeriod` | `7d` / `30d` |
| `nextResetAt` | 下次重置時間 |

`used > allocated` 的 Key 顯示「🔴 硬擋」badge。

**影響檔案**：
- `src/Website/Admin/Pages/AdminApiKeysPage.ts`：查詢補充用量欄位
- `resources/js/Pages/Admin/ApiKeys/columns.tsx`：新增欄位定義

---

## 4. 架構約束

- Admin 分流邏輯僅在 **presentation 層**（`LoginPage.ts`），不修改 domain/application 層
- 配額調整演算法實作在 **Application Service**，不在 Page handler 內
- 所有 admin 路由繼續使用現有 `requireAdmin` middleware，不新增 middleware
- 不新增 npm 依賴

---

## 5. 安全考量

- `/admin/*` 路由已有 `requireAdmin` 守衛（role !== 'admin' → 403）
- 後續可在 nginx 層對 `/admin/*` 加 IP 白名單，不需應用層修改
- `AdjustContractQuotaService` 執行時需原子性（單一 transaction），避免部分更新

---

## 6. 測試要點

- 登入分流：admin / manager / member 分別登入後導向正確路徑
- Google OAuth admin 登入同樣導向 `/admin/dashboard`
- 配額調整：調降至 `newCap ≥ sumAllocated` 不動 Key；調降至 `newCap < sumAllocated` 觸發比例縮減
- 調降後 `allocated < used` 的 Key 進入硬擋狀態
- 前端預覽計算與後端結果一致

---

## 7. 文件版本

| 日期 | 變更 |
|------|------|
| 2026-04-16 | 初版 |
