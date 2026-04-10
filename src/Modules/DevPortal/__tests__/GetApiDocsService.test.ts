import { describe, it, expect, beforeAll } from 'vitest'
import { GetApiDocsService } from '../Application/Services/GetApiDocsService'

describe('GetApiDocsService', () => {
  let service: GetApiDocsService

  beforeAll(() => {
    service = new GetApiDocsService()
  })

  it('應回傳 API 文件資訊', async () => {
    const result = await service.execute()
    expect(result.success).toBe(true)
    expect(result.data).toBeTruthy()
    expect(result.data?.openApiUrl).toBeTruthy()
    expect(result.data?.version).toBeTruthy()
  })

  it('應包含可用的 API 端點列表', async () => {
    const result = await service.execute()
    expect(result.data?.endpoints).toBeInstanceOf(Array)
    expect(result.data?.endpoints.length).toBeGreaterThan(0)
  })

  it('每個端點應包含 method、path、description', async () => {
    const result = await service.execute()
    const endpoint = result.data?.endpoints[0]
    expect(endpoint).toHaveProperty('method')
    expect(endpoint).toHaveProperty('path')
    expect(endpoint).toHaveProperty('description')
  })
})
