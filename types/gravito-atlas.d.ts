/**
 * 型別宣告：當 @gravito/atlas 未提供 dist/ 時的 fallback。
 * 若套件已正確建置並包含 dist/index.d.ts，可刪除此檔。
 */
declare module '@gravito/atlas' {
  /** Orbit 實例，可轉為 GravitoOrbit 使用 */
  export const OrbitAtlas: unknown

  /** 查詢建構器（table 鏈式 API） */
  interface TableQuery<T = Record<string, unknown>> {
    insert(data: T | T[]): Promise<void>
  }

  /** 資料庫連線／查詢介面（migrations、seeders 用） */
  export const DB: {
    table<T = Record<string, unknown>>(name: string): TableQuery<T>
    raw(sql: string): Promise<unknown>
  }
}
