import { describe, it, expect } from 'vitest'
import { Application } from '../Domain/Aggregates/Application'
import { ApplicationMapper } from '../Infrastructure/Mappers/ApplicationMapper'
import { ApplicationPresenter } from '../Application/DTOs/RegisterAppDTO'

describe('Application', () => {
  const defaultParams = {
    id: 'app-1',
    name: 'My Test App',
    description: 'A test application',
    orgId: 'org-1',
    createdByUserId: 'user-1',
    redirectUris: ['https://example.com/callback'],
  }

  it('應建立新的 Application（初始為 active 狀態）', () => {
    const app = Application.create(defaultParams)
    expect(app.id).toBe('app-1')
    expect(app.name).toBe('My Test App')
    expect(app.description).toBe('A test application')
    expect(app.orgId).toBe('org-1')
    expect(app.createdByUserId).toBe('user-1')
    expect(app.status).toBe('active')
    expect(app.webhookUrl).toBeNull()
    expect(app.webhookSecret).toBeNull()
    expect(app.redirectUris).toEqual(['https://example.com/callback'])
    expect(app.createdAt).toBeInstanceOf(Date)
    expect(app.updatedAt).toBeInstanceOf(Date)
  })

  it('名稱為空應拋出錯誤', () => {
    expect(() => Application.create({ ...defaultParams, name: '' })).toThrow(
      'Application 名稱不能為空',
    )
  })

  it('名稱過長應拋出錯誤', () => {
    expect(() => Application.create({ ...defaultParams, name: 'x'.repeat(256) })).toThrow(
      'Application 名稱不能超過 255 字',
    )
  })

  it('應更新名稱和描述', () => {
    const app = Application.create(defaultParams)
    const updated = app.updateInfo('New Name', 'New description')
    expect(updated.name).toBe('New Name')
    expect(updated.description).toBe('New description')
    expect(updated.id).toBe(app.id)
  })

  it('已封存的應用不能更新資訊', () => {
    const app = Application.create(defaultParams)
    const archived = app.archive()
    expect(() => archived.updateInfo('New', 'Desc')).toThrow('已封存的應用不能修改')
  })

  it('應設定 webhook URL 與 secret', () => {
    const app = Application.create(defaultParams)
    const withWebhook = app.setWebhook('https://example.com/webhook', 'whsec_test123')
    expect(withWebhook.webhookUrl).toBe('https://example.com/webhook')
    expect(withWebhook.webhookSecret).toBe('whsec_test123')
  })

  it('webhook URL 必須是 HTTPS', () => {
    const app = Application.create(defaultParams)
    expect(() => app.setWebhook('http://example.com/webhook', 'whsec_test')).toThrow(
      'Webhook URL 必須使用 HTTPS',
    )
  })

  it('應清除 webhook 設定', () => {
    const app = Application.create(defaultParams)
    const withWebhook = app.setWebhook('https://example.com/webhook', 'whsec_test')
    const cleared = withWebhook.clearWebhook()
    expect(cleared.webhookUrl).toBeNull()
    expect(cleared.webhookSecret).toBeNull()
  })

  it('應 suspend 應用', () => {
    const app = Application.create(defaultParams)
    const suspended = app.suspend()
    expect(suspended.status).toBe('suspended')
  })

  it('已 suspended 的應用可以 reactivate', () => {
    const app = Application.create(defaultParams)
    const reactivated = app.suspend().reactivate()
    expect(reactivated.status).toBe('active')
  })

  it('應 archive 應用', () => {
    const app = Application.create(defaultParams)
    const archived = app.archive()
    expect(archived.status).toBe('archived')
  })

  it('已封存的應用不能 reactivate', () => {
    const app = Application.create(defaultParams)
    const archived = app.archive()
    expect(() => archived.reactivate()).toThrow('已封存的應用不能重新啟用')
  })

  it('應更新 redirect URIs', () => {
    const app = Application.create(defaultParams)
    const updated = app.updateRedirectUris(['https://new.example.com/cb'])
    expect(updated.redirectUris).toEqual(['https://new.example.com/cb'])
  })

  it('ApplicationMapper.toDatabaseRow 應正確轉換', () => {
    const app = Application.create(defaultParams)
    const row = ApplicationMapper.toDatabaseRow(app)
    expect(row.id).toBe('app-1')
    expect(row.name).toBe('My Test App')
    expect(row.description).toBe('A test application')
    expect(row.org_id).toBe('org-1')
    expect(row.created_by_user_id).toBe('user-1')
    expect(row.status).toBe('active')
    expect(row.webhook_url).toBeNull()
    expect(row.webhook_secret).toBeNull()
    expect(row.redirect_uris).toBe('["https://example.com/callback"]')
    expect(row.created_at).toBeTruthy()
    expect(row.updated_at).toBeTruthy()
  })

  it('fromDatabase 應正確重建', () => {
    const app = Application.create(defaultParams)
    const row = ApplicationMapper.toDatabaseRow(app)
    const rebuilt = Application.fromDatabase(row)
    expect(rebuilt.id).toBe('app-1')
    expect(rebuilt.name).toBe('My Test App')
    expect(rebuilt.status).toBe('active')
    expect(rebuilt.redirectUris).toEqual(['https://example.com/callback'])
  })

  it('ApplicationPresenter 應回傳安全的資料（不含 webhook secret）', () => {
    const app = Application.create(defaultParams)
    const withWebhook = app.setWebhook('https://example.com/hook', 'whsec_secret')
    const dto = ApplicationPresenter.fromEntity(withWebhook)
    expect(dto.id).toBe('app-1')
    expect(dto.name).toBe('My Test App')
    expect(dto.webhookUrl).toBe('https://example.com/hook')
    expect(dto).not.toHaveProperty('webhookSecret')
  })
})
