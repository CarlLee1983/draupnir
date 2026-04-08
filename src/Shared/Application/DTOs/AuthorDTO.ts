/**
 * Author 資訊 DTO（跨 Domain 共享）
 *
 * 用途：
 * - 多個 Domain（Post、Review、Order 等）都可能需要作者資訊
 * - 統一定義作者的數據結構，避免重複
 *
 * 位置：Shared 層（不屬於任何特定 Domain）
 * 依賴方向：各 Domain → Shared（無反向依賴）
 */

export interface AuthorDTO {
  id: string
  name: string
  email: string
}
