/**
 * 型別宣告：當 @gravito/plasma 未提供型別時的 fallback。
 * 若套件已正確建置並包含型別，可刪除此檔。
 */
declare module '@gravito/plasma' {
  /** Redis 連線設定（OrbitPlasma） */
  export interface RedisManagerConfig {
    host?: string
    port?: number
    password?: string
    db?: number
    keyPrefix?: string
    [key: string]: unknown
  }

  /** Redis 用戶端契約（適配器用） */
  export interface RedisClientContract {
    ping(): Promise<string>
    get(key: string): Promise<string | null>
    set(key: string, value: string, options?: { ex: number } | number): Promise<void>
    del(key: string): Promise<void>
    exists(key: string): Promise<number>
    [key: string]: unknown
  }
}
