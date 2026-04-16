# 合約額度與 API Key 配發規格

> **狀態**：規格已定稿（決策層）；實作另案排程。  
> **範圍**：組織合約可配發總量、未分配池、各 API Key 配發與用量重置、Admin 調降、Manager 重配、阻擋策略。  
> **關聯**：組織與多租戶見 [2-user-organization](./2-user-organization/README.md)；API Key 見 [3-api-keys](./3-api-keys/README.md)；信用／扣款見 [4-credit-billing](./4-credit-billing/credit-system-design.md)。本規格描述 **配額語意與規則**，與底層以 Credit 或 Token 計量之實作對接時，應維持下列不變式。

---

## 1. 目的與問題陳述

### 1.1 商業語意

- **組織**建立時會一併建立 **合約**；合約承載該組織在產品上可使用的 **可配發總額度**（以下稱 **合約上限** `contractCap`）。
- **Admin** 設定或調整組織的合約上限。
- **Manager**（組織管理者）將合約額度 **配發** 到各 **API Key**；各 Key 可有不同 **用量重置週期**（目前支援 **7 日**、**30 日**，日後可擴充）。
- 需避免兩類衝突：
  1. **Admin 調降**合約上限後，已配發到各 Key 的加總仍高於新上限。
  2. **Manager 調降**某 Key 配發時，誤以為可釋出「名義差額」給其他 Key，而忽略該 Key **當期已用量**。

### 1.2 本文件不涵蓋（刻意留待他案）

- 計費帳務、發票、付款條款。
- **預約於未來週期生效**的調降（僅列為 [§8 後續迭代](#8-後續迭代預約生效與其他擴充)）；現行僅 **[立即生效](#52-生效時機)**。
- 具體 API 路由、資料表、UI 線框（實作時應回溯本規格之 **不變式** 與 **演算法**）。

---

## 2. 名詞與定義

### 2.1 角色（與產品權限對齊）

| 角色 | 說明（本規格相關能力） |
|------|------------------------|
| **admin** | 設定／調整 **合約上限**；調降時觸發 **系統級配發調整**（見 §5）；可通知 Manager。 |
| **manager** | 在合約允許範圍內 **建立／管理 API Key**、**配發與重配**額度（見 §6）；管理組織成員（見組織規格）。 |
| **member** | 一般使用者；是否可建立 Key 依產品政策（預設以組織政策為準，本規格不強制）。 |

（若實作上 `OWNER`／`ADMIN`／`MEMBER` 與上表對應，以 **identity** 規格為準；本文件以 **admin / manager / member** 表 **能力**，非強制與程式 enum 同名。）

### 2.2 合約與額度

- **合約上限 `contractCap`**：該組織 **最多可配發到該組織底下 API Key 的額度總和** 之上限（單位與產品計量一致，例如與 Credit 或 Token 對齊；本規格以抽象 **單位** 表示）。
- **已配發總和 `sumAllocated`**：該組織所有 API Key 之 **當前配發值** `allocated_i` 之和。
- **未分配池 `unallocated`**：

  \[
  unallocated = contractCap - sumAllocated
  \]

  規格要求 **`unallocated ≥ 0`** 為常態不變式；若因調降導致暫時違反，見 §5、§7。

### 2.3 API Key 層級

對每一支屬於該組織的 API Key *i*：

| 符號 | 意義 |
|------|------|
| `allocated_i` | 目前配發給該 Key 的額度上限（單一數字，與合約同一計量單位）。 |
| `used_i` | **當前重置週期內**已消耗量（見 §2.4）。 |
| `slack_i` | **可從該 Key「名義上釋出」給其他 Key 的量**（供 Manager 重配時使用）： |

  \[
  slack_i = \max(0,\ allocated_i - used_i)
  \]

### 2.4 用量重置週期

- 每支 Key 設定 **重置週期** `resetPeriod ∈ { 7d, 30d, … }`（日後擴充僅需新增列舉與對應的 `used_i` 歸屬規則）。
- **`used_i`** 必須與 **該 Key 當前週期** 對齊：新週期開始時依產品規則歸零或滾動（實作細節不在本規格展開，但 **不變式** 為：用於計算 `slack_i` 與阻擋的 `used_i` 必須 **同源、同期**。）

### 2.5 與「信用／計費」模組的關係

- 合約與 Key 配發描述的是 **組織配額政策**；實際請求是否允許仍須通過 **餘額／用量** 檢查（例如 Credit 模組）。
- **硬擋**（§7）語意上為：**在配額與政策允許前，不得新增消耗**；若現行實作以凍結 Key、回 402/429 等方式呈現，應與本規格一致。

---

## 3. 不變式（必須維持）

以下 **Invariant** 在系統處於穩定狀態時應成立；調整過程中的短暫狀態見 §5、§7。

1. **配發不超過合約**  
   \[
   sumAllocated \le contractCap
   \]

2. **單 Key 配發不低於當期已用量**（Manager 手動調整與系統調整皆適用）  
   \[
   allocated_i \ge used_i \quad (\text{對所有啟用配額檢查之 Key } i)
   \]

3. **未分配非負**（穩定狀態）  
   \[
   unallocated = contractCap - sumAllocated \ge 0
   \]

4. **`slack_i` 僅作為「可釋出量」**  
   Manager 將額度從 Key *A* 轉給 Key *B* 時，從 *A* 能轉出的量 **不得大於 `slack_A`**（見 §6.2 範例）。

---

## 4. 生命週期（概要）

1. **建立組織** → 建立 **合約**（含初始 `contractCap`，由 Admin 或開通流程設定）。
2. Manager 建立 API Key，並為每支 Key 設定 `allocated_i` 與 `resetPeriod`（在 `sumAllocated ≤ contractCap` 前提下）。
3. 運維過程中 Admin 可能 **調升／調降** `contractCap`；調降依 §5。
4. Manager 可隨時在滿足不變式前提下 **重配** §6。

---

## 5. Admin 調降合約上限

### 5.1 觸發

Admin 將 `contractCap` 從 `oldCap` 調整為 `newCap`，且 `newCap < oldCap`。

### 5.2 生效時機

- **現行版本**：**立即生效**（單一交易或等價原子流程內完成配額重算與持久化）。
- **預約週期生效**：不納入現行範圍，見 §8。

### 5.3 演算法：先扣未分配，再比例縮減已配發

設調降前：

- `S = sumAllocated_old = Σ allocated_i`
- `unallocated_old = oldCap - S`
- 合約上限自 `oldCap` 調為 `newCap`（`newCap < oldCap`）

**步驟 1 — 合約降幅先由「未分配池」吸收**

- 合約降幅 `Δcap = oldCap - newCap`。
- 未分配池最多可「吃掉」的降幅為 `unallocated_old`（再多就必須動到已配發到 Key 的量）。
- 僅縮未分配、**不動各 Key** 的前提：`newCap ≥ S`。  
  - 若成立：`allocated_i` 全不變，`unallocated_new = newCap - S ≥ 0`。結束。
  - 若不成立（`S > newCap`）：必須從各 Key 縮減總量：

\[
takeFromKeysTotal = S - newCap = \max(0,\ S - newCap)
\]

（此數值等價於：合約降幅在扣掉「未分配池已吸收的部分」後，剩餘必須自 Key 上收回的量；當 `unallocated_old > 0` 時，合約降幅會先沖掉未分配，上式仍成立，因 `S` 與 `newCap` 已決定 Key 側必須少掉 `S - newCap`。）

**步驟 2 — 對應自 Key 縮減總量 `takeFromKeysTotal` 做等比例分配**

- 若 `takeFromKeysTotal = 0`，各 `allocated_i` 不變。
- 若 `takeFromKeysTotal > 0`：**預設策略（本規格採用）**為對所有計入該合約的 Key **等比例**縮減，使 **`Σ allocated_i^{new} = newCap`**（與「先吸收未分配」後的目標一致；見 §5.4 捨入）。

等價敘述：將各 Key 新配發設為與原配發成正比，且加總為 `newCap`：

\[
allocated_i^{new} = \text{round}\left( allocated_i \cdot \frac{newCap}{S} \right) \quad \text{並以 §5.4 收斂加總誤差}
\]

### 5.4 捨入與加總收斂

- 比例縮放後 **`Σ allocated_i^{new}` 必須等於 `newCap`**（若計量為整數單位，允許最後一支 Key 或系統指定的一支 **吸收 ±1 單位誤差**，並寫入實作規約）。
- 縮放後若某 Key 出現 **`allocated_i^{new} < used_i`**：違反 Invariant 2 → 進入 §7 **硬擋** 與 **待處理狀態**（通知 Manager／Admin）。

### 5.5 通知

- Admin 調降完成後，應 **通知** 該組織 Manager：**新合約上限**、**生效時間**（立即）、以及 **各 Key 配發變更摘要**（至少含變動前後或可下載審計）。

---

## 6. Manager 重配（手動調整各 Key 配發）

### 6.1 允許操作

- 在滿足 §3 不變式前提下，Manager 可 **提高或降低** 某 Key 的 `allocated_i`，或 **在 Key 之間轉移**額度（透過一降一升或批次調整）。

### 6.2 「可挪給別人」的量 = slack（核心規則）

- 從 Key *A* **釋出**給其他 Key 使用的額度 **不得超過** `slack_A = max(0, allocated_A - used_A)`。
- **範例（與討論一致）**：  
  - `allocated_A = 20`，`used_A = 15` → `slack_A = 5`。  
  - Manager 若想把 A 調到 **10**：因 `10 < used_A(15)`，**違反 Invariant 2**，應 **拒絕該調降**（或僅允許調降至 **≥ 15**，視 UI 如何引導）。  
  - 能分配給其他 Key 的，是 **至多 5** 單位（未用量），而非名義上的 `20 - 10 = 10`。

### 6.3 與合約上限

- 任意調整後須 **`sumAllocated ≤ contractCap`**；通常 **先加總檢查**，必要時先自其他 Key 依 `slack` 釋出額度。

---

## 7. 阻擋策略（硬擋）

### 7.1 定義

- **硬擋**：當請求會使 **`used_i` 超過 `allocated_i`**（在當期重置週期內），或 **`allocated_i < used_i`**（資料不一致／調降後遺留），系統 **不得** 再允許新增消耗，直到 **重配、週期重置、或 Admin 調升** 等操作恢復合法狀態。

### 7.2 Admin 調降後的邊角

- 若比例縮放後某 Key **`allocated_i^{new} < used_i`**：  
  - **消耗面**：立即硬擋該 Key 之新用量。  
  - **治理面**：標示 **需處理**（例如：待下個重置週期自然緩解、或 Manager 從其他 Key 調配、或 Admin 調升／手動處理）。具體 **Remediation 流程** 可单列營運 playbook，但 **技術上不允許** 在 `allocated < used` 下繼續增加消耗。

---

## 8. 後續迭代（預約生效與其他擴充）

以下項目 **不納入現行必備規格**，預留擴充時回溯本文不變式：

1. **預約於未來週期生效**的 `contractCap` 調降（與帳期對齊）。
2. **非比例**的調降策略（例如依 Key 優先級先縮減）；若導入需重寫 §5.3 並保留 Invariant。
3. **多合約**／**版本化合約**（一組織多份有效合約）— 需重新定義 `contractCap` 與聚合方式。
4. 新型 **`resetPeriod`**（例如自然月、帳務月）。

---

## 9. 稽核與可觀測性（建議）

- **稽核日誌**：`contractCap` 變更（操作者、舊值、新值、原因碼）、各 Key `allocated_i` 批量變更、Manager 單 Key 調整。
- **儀表**：Manager 可見 **`contractCap`、`sumAllocated`、`unallocated`**、各 Key 的 `allocated_i`、`used_i`、`slack_i`、下次重置時間（若有）。

---

## 10. 驗收要點（規格層）

- [ ] 調降流程遵守 **先未分配、再比例**（§5.3），且最終 **`sumAllocated = newCap`**（允許文檔化的捨入規則）。
- [ ] 任意時刻穩定狀態滿足 §3 不變式。
- [ ] Manager 重配時，自某 Key 轉出量 **≤ slack**（§6.2）；試圖將 `allocated` 調低於 `used` 時 **拒絕或需先處理超用**。
- [ ] **`used > allocated` 時硬擋**新增消耗（§7）。
- [ ] Admin 調降後 **通知 Manager**（§5.5）。

---

## 11. 文件版本

| 日期 | 變更 |
|------|------|
| 2026-04-16 | 初版：合約上限、未分配、7d/30d、立即生效、先未分配再比例、硬擋、slack 重配。 |
| 2026-04-16 | 新增 §13 待決議事項：建立 API Key 時是否可不設定 RPM／TPM。 |

---

## 12. 參考

- [3-api-keys README](./3-api-keys/README.md)
- [4-credit-billing / credit-system-design](./4-credit-billing/credit-system-design.md)
- [1-authentication / identity-design](./1-authentication/identity-design.md)（RBAC／組織角色）

---

## 13. 待決議事項

以下與本規格相關（API Key、合約／組織配額銜接）但 **尚未由產品拍板**，實作前應定案。

### 13.1 建立 API Key 時是否允許「不設定」RPM／TPM

**背景**：會員建立 Key 表單目前對 RPM／TPM 有 UI 預設值；後端會員入口亦對缺省欄位填入固定預設（與「留空＝不設定」不同）。

**技術事實（實作現狀摘要）**

- 領域模型 `KeyScope` 允許 `rate_limit_rpm`／`rate_limit_tpm` 為 `null`（語意上可解讀為不在該 Key 上另設 per-key 限速）。
- 對外 JSON API 若省略兩欄位，可形成上述 `null`；同步至 Gateway 時，兩者皆為 `null` 則不寫入 per-key `rateLimit`。
- 會員 Inertia 建立流程目前 **強制預設數字**，故 **無法**僅靠現有 UI 表達「不填、沿用他層預設」。

**待產品決議**

1. 是否開放 Manager／使用者建立 Key 時 **可不填** RPM／TPM（與「一律帶預設數字」二選一或並存）。
2. 若允許不填：**語意**為繼承何者 — 例如合約條款、組織預設、Gateway 全域預設，或僅「不在我們層寫入限制」。
3. 若允許不填：會員端需調整表單與 `MemberApiKeyCreatePage` 對 body 的解析（空值 vs 預設值），並補驗收與文件（含 [3-api-keys](./3-api-keys/README.md)）。

**狀態**：待決議（2026-04-16 記錄）。
