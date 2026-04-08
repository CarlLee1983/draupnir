/**
 * uuid v3 型別宣告（該版本未內建 .d.ts）
 */
declare module 'uuid' {
  export function v4(): string
  export function v1(): string
  export function v5(name: string, namespace: string): string
}

declare module 'uuid/v4' {
  export default function v4(): string
}
