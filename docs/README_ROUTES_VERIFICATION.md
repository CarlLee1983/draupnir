# Routes 驗證完整體系導航

> 本項目已建立一套完整的、可復用的 API routes 驗證方法論和工具包。本文檔是導航索引。

## 📚 文檔導航

### 🎯 根據需求選擇

#### 「我想快速在現有項目中使用」
👉 [ROUTES_VERIFICATION_QUICKSTART.md](./ROUTES_VERIFICATION_QUICKSTART.md) (5 分鐘)

#### 「我想深入了解完整的實施步驟」
👉 [ROUTES_VERIFICATION_GUIDE.md](./ROUTES_VERIFICATION_GUIDE.md) (詳細指南)

#### 「我想了解工具的功能和用途」
👉 [ROUTES_VERIFICATION_TOOLKIT.md](./ROUTES_VERIFICATION_TOOLKIT.md) (工具說明)

#### 「我想了解這套方法論如何應用到其他項目」
👉 [../REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md) (可復用方法論)

---

## 🗂️ 文件結構

```
Draupnir Project/
│
├── 📖 REUSABLE_METHODOLOGY.md
│   └── 如何在其他項目中應用此方法論
│
├── 📊 ROUTES_VERIFICATION.md
│   └── 驗證結果報告和統計
│
├── docs/
│   ├── README_ROUTES_VERIFICATION.md (本文檔)
│   ├── ROUTES_VERIFICATION_QUICKSTART.md
│   │   └── 30 秒快速上手
│   ├── ROUTES_VERIFICATION_GUIDE.md
│   │   └── 完整實施指南
│   └── ROUTES_VERIFICATION_TOOLKIT.md
│       └── 工具包功能說明
│
├── scripts/
│   └── routes-analyzer.ts
│       └── 路由掃描分析工具（可復用）
│
├── tests/
│   ├── Feature/
│   │   ├── routes-existence.test.ts
│   │   │   └── 快速驗證測試（可復用）
│   │   └── routes-connectivity.test.ts
│   │       └── 完整驗證測試（可復用）
│   ├── lib/
│   │   └── test-client.ts
│   │       └── HTTP 客戶端（可復用）
│   └── routes-validation.report.md
│       └── 詳細路由列表報告
│
└── .claude/projects/.../memory/
    ├── routes-verification-methodology.md
    │   └── 方法論完整記錄
    └── MEMORY.md
        └── 內存索引
```

---

## 🚀 快速開始 (5 分鐘)

### 步驟 1: 複製工具

```bash
# 複製三個核心文件到你的項目
cp scripts/routes-analyzer.ts your-project/scripts/
cp tests/lib/test-client.ts your-project/tests/lib/
cp tests/Feature/routes-existence.test.ts your-project/tests/Feature/
```

### 步驟 2: 配置命令

```bash
# 添加到你的 package.json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:routes": "bun test tests/Feature/routes-existence.test.ts",
    "verify:routes": "npm run routes:analyze && npm run test:routes"
  }
}
```

### 步驟 3: 運行驗證

```bash
npm run verify:routes
```

### 📊 預期結果

```
🔍 正在分析路由: src/Modules

✅ 72 pass
Ran 72 tests across 1 file. [1.81s]

💾 詳細分析已保存至: routes-analysis.json
```

---

## 📖 詳細文檔說明

### 1. [ROUTES_VERIFICATION_QUICKSTART.md](./ROUTES_VERIFICATION_QUICKSTART.md)
**適合**: 想快速開始的人  
**內容**: 
- 30 秒快速上手
- 項目結構調整（Fastify/Express）
- 常見問題解決
- 高級用法示例

**閱讀時間**: 10 分鐘

### 2. [ROUTES_VERIFICATION_GUIDE.md](./ROUTES_VERIFICATION_GUIDE.md)
**適合**: 想深入了解的人  
**內容**:
- 完整實施步驟（5 步驟）
- 三層驗證框架詳解
- 中間件檢查清單
- CI/CD 集成示例
- 故障排除指南
- 性能優化

**閱讀時間**: 30 分鐘

### 3. [ROUTES_VERIFICATION_TOOLKIT.md](./ROUTES_VERIFICATION_TOOLKIT.md)
**適合**: 想了解工具功能的人  
**內容**:
- 工具包內容清單
- 各工具功能詳解
- 支持的項目結構
- 擴展和集成示例
- 性能指標

**閱讀時間**: 20 分鐘

### 4. [../REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md)
**適合**: 想在其他項目應用的人  
**內容**:
- 可復用資產清單
- 應用步驟（方案 A/B）
- 項目特定調整
- 驗證清單
- 投資回報分析

**閱讀時間**: 15 分鐘

---

## 🎯 應用場景

### 開發時使用
```bash
# 修改路由後快速驗證
npm run test:routes
```

### 提交前驗證
```bash
# 完整驗證（在 git commit 之前）
npm run verify:routes
```

### CI/CD 集成
```bash
# 自動驗證（GitHub Actions / GitLab CI）
npm run test:routes:ci
```

---

## 📊 驗證結果

### Draupnir 項目驗證結果

| 項目 | 數量 | 狀態 |
|------|------|------|
| **模組數** | 13 | ✅ |
| **Routes 數** | 68 | ✅ |
| **測試數** | 72 | ✅ 通過 |
| **耗時** | 1.81s | ✅ |

### 驗證詳情
- 📋 [完整驗證報告](../ROUTES_VERIFICATION.md)
- 📊 [詳細路由列表](../tests/routes-validation.report.md)
- 📈 [分析結果](../routes-analysis.json)

---

## 🛠️ 核心工具

### Routes Analyzer
**用途**: 掃描並分析所有路由定義  
**命令**: `bun scripts/routes-analyzer.ts`  
**輸出**: 統計信息 + routes-analysis.json  
**耗時**: ~0.5 秒  

### Routes Existence Test
**用途**: 驗證所有 routes 都存在且能連接  
**命令**: `bun test tests/Feature/routes-existence.test.ts`  
**覆蓋**: 72 個測試用例  
**耗時**: ~1.8 秒  

### Routes Connectivity Test
**用途**: 詳細驗證認證、授權、中間件  
**命令**: `bun test tests/Feature/routes-connectivity.test.ts`  
**覆蓋**: 52 個詳細驗證  
**耗時**: ~2.0 秒  

---

## 💡 最佳實踐

### 1. 定期運行驗證
```bash
# 開發時：每次修改路由後
npm run test:routes

# 提交前：完整驗證
npm run verify:routes

# CI 中：自動驗證
npm run test:routes:ci
```

### 2. 新增 Route 檢查清單
- [ ] 在 Presentation/Routes 定義
- [ ] Controller 方法已實現
- [ ] 必要的中間件已應用
- [ ] 輸入驗證 Schema 已定義
- [ ] npm run verify:routes 通過

### 3. 文件組織
```
src/Modules/ModuleName/
└── Presentation/Routes/
    └── moduleName.routes.ts
```

---

## 🔄 集成到 CI/CD

### GitHub Actions
```yaml
- name: Verify Routes
  run: npm run test:routes:ci
```

### GitLab CI
```yaml
verify_routes:
  script:
    - npm run verify:routes
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npm run verify:routes
```

---

## 📈 投資與收益

### 一次性投資
- 複製工具: 2-3 分鐘
- 配置命令: 2-3 分鐘
- 首次運行: 2-3 分鐘
- **總計**: 5-10 分鐘

### 長期收益
- 自動化驗證: 每次提交節省 2-5 分鐘
- 早期缺陷發現: 節省調試時間 30%+
- 自動報告生成: 節省文檔時間
- 新人上手: 清晰的驗證流程

---

## ✅ 驗證清單

使用此體系時確保：

- [ ] 已閱讀本導航文檔
- [ ] 已複製所有必要工具
- [ ] 已配置 package.json 命令
- [ ] 已成功運行 npm run verify:routes
- [ ] 已集成到 CI/CD（可選）
- [ ] 已配置 pre-commit hook（可選）
- [ ] 已更新項目文檔（可選）

---

## 🆘 需要幫助？

### 快速問題？
👉 [ROUTES_VERIFICATION_QUICKSTART.md - 常見問題](./ROUTES_VERIFICATION_QUICKSTART.md#常見問題)

### 詳細問題？
👉 [ROUTES_VERIFICATION_GUIDE.md - 故障排除](./ROUTES_VERIFICATION_GUIDE.md#故障排除)

### 其他項目適用？
👉 [REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md)

---

## 📚 相關資源

### 文檔
- [快速開始](./ROUTES_VERIFICATION_QUICKSTART.md)
- [完整指南](./ROUTES_VERIFICATION_GUIDE.md)
- [工具說明](./ROUTES_VERIFICATION_TOOLKIT.md)
- [可復用方法論](../REUSABLE_METHODOLOGY.md)

### 代碼
- [路由分析工具](../scripts/routes-analyzer.ts)
- [快速驗證測試](../tests/Feature/routes-existence.test.ts)
- [完整驗證測試](../tests/Feature/routes-connectivity.test.ts)
- [HTTP 客戶端](../tests/lib/test-client.ts)

### 報告
- [驗證報告](../ROUTES_VERIFICATION.md)
- [路由列表](../tests/routes-validation.report.md)
- [分析結果](../routes-analysis.json)

---

## 🎓 學習路徑

```
初級用戶:
1. 本導航 (5 min) ← 你在這裡
2. 快速開始 (5 min)
3. 複製工具並運行 (5 min)
✅ 完成

中級用戶:
1. 本導航 (5 min)
2. 完整指南 (20 min)
3. 實施和集成 (15 min)
4. 自定義配置 (10 min)
✅ 完成

高級用戶:
1. 本導航 (5 min)
2. 工具包說明 (15 min)
3. 可復用方法論 (15 min)
4. 擴展和優化 (30 min)
✅ 完成
```

---

## 📄 版本信息

- **體系版本**: v1.0
- **最後更新**: 2026-04-10
- **已驗證於**: Draupnir v0.1.0
- **驗證結果**: 68 routes / 72 tests ✅

---

## 🎉 下一步

1. **選擇你的文檔**: 根據上面的需求選擇合適的文檔
2. **開始應用**: 遵循相應的指南
3. **運行驗證**: 執行 `npm run verify:routes`
4. **查看結果**: 檢查控制台和生成的報告

準備好了嗎？👉 [快速開始指南](./ROUTES_VERIFICATION_QUICKSTART.md)

---

**有任何問題或建議？** 查看相應的文檔或參考 [故障排除指南](./ROUTES_VERIFICATION_GUIDE.md#故障排除)。
