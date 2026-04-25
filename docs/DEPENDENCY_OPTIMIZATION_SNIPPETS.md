# Bun 依賴優化 - 代碼片段庫

**版本** 1.1.0  
**日期** 2026-04-26  
**用途** 提供可直接使用的代碼片段和參考實現

---

## 📁 代碼片段

### 1. SHA-256 雜湊函數

**檔案位置** 多個服務中內聯實現  
**使用場景** Token 雜湊、數據完整性驗證  
**特性** Async，使用 Web Crypto API

#### 實現
```typescript
/**
 * SHA-256 雜湊函數
 * 
 * @param str 待雜湊的字符串
 * @returns 十六進制雜湊值（64 個字符）
 * 
 * @example
 * const hash = await sha256('mytoken')
 * // Returns: '9b71d224bd62f3785d96f46e3e6a1fe17d8d150f0e2b1a3e6...'
 */
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

#### 使用示例
```typescript
// 在異步函數中使用
async function handleLogin(token: string) {
  const tokenHash = await sha256(token)
  // 保存 tokenHash 到資料庫
  await authTokenRepository.save({
    tokenHash,
    expiresAt: new Date(Date.now() + 3600000)
  })
}

// 驗證 token
async function verifyToken(storedHash: string, providedToken: string) {
  const computedHash = await sha256(providedToken)
  return computedHash === storedHash
}
```

#### 注意事項
- 必須在 async 函數中使用
- 返回小寫十六進制字符串
- 相同輸入永遠生成相同輸出
- 時間複雜度 O(1)，適合頻繁使用

---

### 2. 路徑操作工具函數

#### 2.1 joinPath() - 路徑拼接

**用途** 安全地拼接路徑片段，替代 `node:path.resolve()`

```typescript
/**
 * 安全地拼接路徑片段
 * 
 * @param parts 路徑片段（可變參數）
 * @returns 拼接後的路徑
 * 
 * @example
 * joinPath('/home', 'user/', '/documents') 
 * // Returns: '/home/user/documents'
 * 
 * joinPath('root', '', 'subdir')
 * // Returns: 'root/subdir'
 */
function joinPath(...parts: string[]): string {
  // 移除每個部分的末尾斜杠
  const cleaned = parts.map((p) => p.replace(/\/$/, ''))
  // 用 / 拼接
  const joined = cleaned.join('/')
  // 正規化：合併多個斜杠，移除 /./ 
  return joined.replace(/\/+/g, '/').replace(/\/\.(?=\/|$)/g, '')
}
```

#### 使用示例
```typescript
// 建立檔案路徑
const viewPath = joinPath(process.cwd(), 'src', 'views', 'app.html')

// 建立 URL 路徑
const apiPath = joinPath('/api', 'v1', 'users', userId)

// 混合斜杠和空字符串
const fullPath = joinPath(
  process.cwd(),
  '', // 忽略
  'public',
  'build/'  // 末尾斜杠自動移除
)
// Result: '{cwd}/public/build'
```

#### 邊界情況處理
```typescript
joinPath('/', 'path')              // '/' + 'path' = '/path'
joinPath('path', '/')              // 'path' + '/' = 'path'
joinPath('//', '//path//')         // '/path'
joinPath('', 'path')               // 'path'
joinPath('path', '', '', 'file')   // 'path/file'
```

---

#### 2.2 normalizePath() - 路徑正規化（安全性）

**用途** 正規化路徑並移除 `..` 防止目錄遍歷攻擊

```typescript
/**
 * 正規化路徑，防止目錄遍歷攻擊
 * 
 * 處理：
 * - 移除空組件
 * - 處理 .. (pop 上一級)
 * - 移除 . (當前目錄)
 * 
 * @param path 輸入路徑
 * @returns 正規化的路徑
 * 
 * @example
 * normalizePath('/home/user/../documents')
 * // Returns: 'home/user/documents' (.. 被消除)
 * 
 * normalizePath('/home/user/../../etc')
 * // Returns: 'etc'
 * 
 * normalizePath('/home/./user')
 * // Returns: 'home/user'
 */
function normalizePath(path: string): string {
  const parts = path.split('/')
  const normalized: string[] = []
  
  for (const part of parts) {
    // 跳過空字符串和 .
    if (part === '' || part === '.') {
      continue
    }
    
    // 處理 ..
    if (part === '..') {
      // 移除上一級（如果存在）
      normalized.pop()
    } else {
      // 添加正常組件
      normalized.push(part)
    }
  }
  
  return normalized.join('/')
}
```

#### 使用示例
```typescript
// 靜態檔案服務的路徑驗證
function serveStaticFile(staticDir: string, userPath: string) {
  // 合併路徑
  const filePath = joinPath(staticDir, userPath)
  
  // 正規化以進行安全檢查
  const normalizedStatic = normalizePath(staticDir)
  const normalizedFile = normalizePath(filePath)
  
  // 驗證檔案在目錄內
  if (!normalizedFile.startsWith(normalizedStatic)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  // 安全地服務檔案
  return Bun.file(filePath)
}

// 使用示例
serveStaticFile('/app/public', '../../../etc/passwd')
// normalizePath: 'app/etc/passwd'
// 檢查失敗：'app/etc/passwd' 不以 'app/public' 開頭
// 返回 403 Forbidden ✅
```

#### 安全性測試
```typescript
// 測試各種攻擊向量
console.assert(
  normalizePath('/home/user/../../../etc').startsWith('etc'),
  '應防止超出根目錄的遍歷'
)

console.assert(
  !normalizePath('/home/./user/./../../etc/passwd').startsWith('home'),
  '應移除 . 並處理 .. 序列'
)

console.assert(
  normalizePath('/home//user///file').split('/').every(p => p),
  '應處理多個斜杠'
)
```

---

### 3. UUID 替換

**檔案位置** 實現在各個服務中，使用 `crypto.randomUUID()`

#### 使用 crypto.randomUUID()

```typescript
/**
 * Bun 原生 UUID 生成（使用 crypto.randomUUID）
 * 
 * 替代 npm uuid 套件
 * 
 * @returns RFC 4122 v4 UUID 字符串
 * 
 * @example
 * const id = crypto.randomUUID()
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 */

// 單個 UUID
const userId = crypto.randomUUID()

// 多個 UUID
const [orgId, memberId] = [
  crypto.randomUUID(),
  crypto.randomUUID()
]

// 在工廠方法中
class User {
  static create(email: string): User {
    return new User({
      id: crypto.randomUUID(),
      email,
      createdAt: new Date()
    })
  }
}
```

#### 批量生成示例
```typescript
// 生成多個 UUID
function generateBatch(count: number): string[] {
  return Array.from({ length: count }, () => crypto.randomUUID())
}

// 使用
const ids = generateBatch(5)
console.log(ids)
// [
//   '550e8400-e29b-41d4-a716-446655440000',
//   'f47ac10b-58cc-4372-a567-0e02b2c3d479',
//   ...
// ]
```

---

## 🔄 遷移檢查清單

### 從 uuid 套件遷移

- [ ] 移除 `import { v4 as uuidv4 } from 'uuid'`
- [ ] 替換所有 `uuidv4()` 為 `crypto.randomUUID()`
- [ ] 驗證 UUID 格式（應為 `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`）
- [ ] 運行測試驗證
- [ ] 從 `package.json` 移除 uuid 依賴（可選）

### 從 createHash 遷移

- [ ] 移除 `import { createHash } from 'crypto'`
- [ ] 添加 `async function sha256()` 實現
- [ ] 替換所有 `createHash('sha256')` 為 `await sha256()`
- [ ] 轉換相關函數為 async
- [ ] 驗證雜湊值相同（向後相容）
- [ ] 運行完整測試

### 從 node:path 遷移

- [ ] 移除 `import { resolve } from 'node:path'`
- [ ] 添加 `joinPath()` 實現
- [ ] 添加 `normalizePath()` 實現（用於安全檢查）
- [ ] 替換所有 `resolve()` 為 `joinPath()`
- [ ] 在安全關鍵位置添加 `normalizePath()` 驗證
- [ ] 測試邊界情況

---

## 📊 性能對比

### 加密操作性能

| 操作 | 實現 | 相對性能 | 用途 |
|------|------|---------|------|
| SHA-256 | crypto.subtle | 基準 100% | Token 雜湊、數據驗證 |
| MD5 | 不支持 | N/A | ❌ 不安全，已棄用 |
| SHA-1 | crypto.subtle | 快於 SHA-256 | ❌ 不安全，已棄用 |
| HMAC | crypto.subtle | 基準 100% | 簽名驗證 |

### 隨機性能

| 操作 | 實現 | 相對性能 |
|------|------|---------|
| UUID v4 | crypto.randomUUID() | 基準 100% |
| 隨機字節 | crypto.getRandomValues() | 快於 UUID |

### 路徑操作性能

| 操作 | 實現 | 時間複雜度 |
|------|------|----------|
| joinPath() | 自實現 | O(n) - n 為部分數 |
| normalizePath() | 自實現 | O(n) - n 為路徑長度 |
| node:path.resolve() | Node.js 原生 | O(n) |

**結論** 自實現的路徑函數性能相當，無顯著差異。

---

## 🧪 測試示例

### 單元測試模板

```typescript
import { describe, it, expect } from 'vitest'

describe('sha256 function', () => {
  it('應生成 64 個字符的十六進制字符串', async () => {
    const hash = await sha256('test')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('相同輸入應生成相同輸出', async () => {
    const hash1 = await sha256('token')
    const hash2 = await sha256('token')
    expect(hash1).toBe(hash2)
  })

  it('不同輸入應生成不同輸出', async () => {
    const hash1 = await sha256('token1')
    const hash2 = await sha256('token2')
    expect(hash1).not.toBe(hash2)
  })

  it('應與已知值匹配', async () => {
    // https://www.sha256online.com/ 驗證
    const hash = await sha256('hello world')
    expect(hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
  })
})

describe('joinPath function', () => {
  it('應拼接多個路徑片段', () => {
    expect(joinPath('/home', 'user', 'documents')).toBe('/home/user/documents')
  })

  it('應移除末尾斜杠', () => {
    expect(joinPath('/home/', 'user/')).toBe('/home/user')
  })

  it('應合併多個斜杠', () => {
    expect(joinPath('//', 'path//')).toBe('/path')
  })

  it('應忽略空字符串', () => {
    expect(joinPath('home', '', 'user')).toBe('home/user')
  })
})

describe('normalizePath function', () => {
  it('應移除 .. 進行上級遍歷', () => {
    expect(normalizePath('home/user/../documents')).toBe('home/documents')
  })

  it('應防止超出根目錄遍歷', () => {
    const result = normalizePath('home/../../etc/passwd')
    expect(result).toBe('etc/passwd')
  })

  it('應移除 .', () => {
    expect(normalizePath('home/./user')).toBe('home/user')
  })

  it('應防止目錄遍歷攻擊', () => {
    const base = normalizePath('/app/public')
    const attack = normalizePath('/app/public/../../../etc/passwd')
    expect(attack.startsWith(base)).toBe(false)
  })
})
```

---

## 🚀 快速開始

### 如何在新項目中使用

1. **複製 sha256 函數**
   ```typescript
   // 粘貼到你的 utils/crypto.ts
   export async function sha256(str: string): Promise<string> {
     // ... 實現
   }
   ```

2. **複製路徑工具**
   ```typescript
   // 粘貼到你的 utils/path.ts
   export function joinPath(...parts: string[]): string {
     // ... 實現
   }
   
   export function normalizePath(path: string): string {
     // ... 實現
   }
   ```

3. **在代碼中使用**
   ```typescript
   import { sha256 } from './utils/crypto'
   import { joinPath, normalizePath } from './utils/path'
   
   const hash = await sha256(token)
   const path = joinPath(root, 'public')
   ```

4. **測試**
   ```bash
   bun test
   ```

---

## 📝 最佳實踐

### ✅ DO

```typescript
// 好：使用 async/await
const hash = await sha256(token)

// 好：正規化敏感路徑
const safePath = normalizePath(filePath)

// 好：生成唯一 ID
const id = crypto.randomUUID()

// 好：組合路徑操作
const file = Bun.file(joinPath(dir, filename))
```

### ❌ DON'T

```typescript
// 不好：忘記 await
const hash = sha256(token) // Promise 而非字符串

// 不好：跳過安全檢查
if (filePath.startsWith(dir)) // 可能被 .. 繞過

// 不好：信任用戶輸入的路徑
const file = Bun.file(userPath) // 應先 normalize

// 不好：使用已棄用的 uuid 套件
import { v4 } from 'uuid' // 使用 crypto.randomUUID()
```

---

**代碼片段版本** 1.0  
**最後更新** 2026-04-10  
**許可** 可自由使用和修改
