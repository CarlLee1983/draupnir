/**
 * 型別宣告：當 @gravito/stasis 未提供型別時的 fallback。
 * 若套件已正確建置並包含型別，可刪除此檔。
 */
declare module '@gravito/stasis' {
  /** 快取管理器契約（適配器用） */
  export interface CacheManager {
    get<T = unknown>(key: string): Promise<T | null>
    set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>
    forget(key: string): Promise<void>
    flush(): Promise<void>
    [key: string]: unknown
  }
}
