import { describe, it } from 'bun:test'
import { extractRoutesFromSource } from './lib/route-extractor'
import { parseOpenAPI } from './lib/spec-parser'

const joinPath = (...parts: string[]) => parts.join('/').replace(/\/+/g, '/')
const SPEC_PATH = joinPath(import.meta.dir, '../../docs/openapi.yaml')

describe('OpenAPI Spec / Route 一致性', () => {
  const spec = parseOpenAPI(SPEC_PATH)
  const specRoutes = spec.operations.map((op) => `${op.method.toUpperCase()} ${op.path}`).sort()

  const actualRoutes = extractRoutesFromSource()

  it('所有已註冊路由都在 openapi.yaml 中有定義', () => {
    const missing = actualRoutes.filter((r) => !specRoutes.includes(r))
    if (missing.length > 0) {
      throw new Error(
        `以下路由未在 openapi.yaml 中定義:\n${missing.map((r) => `  - ${r}`).join('\n')}`,
      )
    }
  })

  it('openapi.yaml 中定義的路由都實際存在', () => {
    const orphaned = specRoutes.filter((r) => !actualRoutes.includes(r))
    if (orphaned.length > 0) {
      throw new Error(
        `以下 spec 路由在程式碼中不存在:\n${orphaned.map((r) => `  - ${r}`).join('\n')}`,
      )
    }
  })
})
