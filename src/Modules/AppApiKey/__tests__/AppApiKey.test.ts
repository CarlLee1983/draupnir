import { beforeAll, describe, expect, it } from 'vitest'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { AppApiKeyPresenter } from '../Application/DTOs/AppApiKeyDTO'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '../Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '../Domain/ValueObjects/BoundModules'
import { KeyRotationPolicy } from '../Domain/ValueObjects/KeyRotationPolicy'
import { AppApiKeyMapper } from '../Infrastructure/Mappers/AppApiKeyMapper'

const hashingService = new KeyHashingService()

let defaultHash: string
let customHash: string
let newKeyHash: string

beforeAll(async () => {
  defaultHash = await hashingService.hash('drp_app_test123abc')
  customHash = await hashingService.hash('drp_app_custom')
  newKeyHash = await hashingService.hash('drp_app_newkey123')
})

describe('AppApiKey', () => {
  const makeDefault = () =>
    AppApiKey.create({
      id: 'appkey-1',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'My SDK Key',
      gatewayKeyId: 'bfr-vk-app-1',
      keyHash: defaultHash,
    })

  it('應建立新的 AppApiKey（初始為 pending 狀態）', () => {
    const key = makeDefault()
    expect(key.id).toBe('appkey-1')
    expect(key.orgId).toBe('org-1')
    expect(key.issuedByUserId).toBe('user-1')
    expect(key.label).toBe('My SDK Key')
    expect(key.status).toBe('pending')
    expect(key.keyHashValue).toMatch(/^[a-f0-9]{64}$/)
    expect(key.appKeyScope.getValue()).toBe('read')
    expect(key.rotationPolicy.isAutoRotate()).toBe(false)
    expect(key.boundModules.isEmpty()).toBe(true)
    expect(key.previousKeyHash).toBeNull()
    expect(key.gracePeriodEndsAt).toBeNull()
  })

  it('應建立帶自訂 scope 和綁定模組的 Key', () => {
    const key = AppApiKey.create({
      id: 'appkey-2',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'My SDK Key',
      gatewayKeyId: 'bfr-vk-app-1',
      keyHash: customHash,
      scope: AppKeyScope.admin(),
      rotationPolicy: KeyRotationPolicy.auto(90, 48),
      boundModules: BoundModules.from(['mod-1', 'mod-2']),
    })
    expect(key.appKeyScope.getValue()).toBe('admin')
    expect(key.rotationPolicy.isAutoRotate()).toBe(true)
    expect(key.rotationPolicy.getRotationIntervalDays()).toBe(90)
    expect(key.boundModules.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })

  it('activate 應將 pending 轉為 active', () => {
    const key = makeDefault()
    const activated = key.activate()
    expect(activated.status).toBe('active')
  })

  it('已 active 的 key 不能再 activate', () => {
    const key = makeDefault()
    const activated = key.activate()
    expect(() => activated.activate()).toThrow()
  })

  it('revoke 應將 active 轉為 revoked', () => {
    const key = makeDefault()
    const revoked = key.activate().revoke()
    expect(revoked.status).toBe('revoked')
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })

  it('rotate 應設定 previousKeyHash 和 gracePeriodEndsAt', () => {
    const key = makeDefault()
    const active = key.activate()
    const rotated = active.rotate(newKeyHash, 'bfr-vk-new-1')
    expect(rotated.status).toBe('active')
    expect(rotated.previousKeyHash).toBeTruthy()
    expect(rotated.previousKeyHash).toMatch(/^[a-f0-9]{64}$/)
    expect(rotated.gracePeriodEndsAt).toBeInstanceOf(Date)
    expect(rotated.keyHashValue).not.toBe(active.keyHashValue)
    expect(rotated.gatewayKeyId).toBe('bfr-vk-new-1')
  })

  it('非 active 狀態不能輪換', () => {
    const key = makeDefault()
    expect(() => key.rotate(newKeyHash, 'bfr-vk-new')).toThrow('Only active keys can be rotated')
  })

  it('completeRotation 應清除 previousKeyHash 和 gracePeriodEndsAt', () => {
    const key = makeDefault()
    const active = key.activate()
    const rotated = active.rotate(newKeyHash, 'bfr-vk-new-1')
    const completed = rotated.completeRotation()
    expect(completed.previousKeyHash).toBeNull()
    expect(completed.gracePeriodEndsAt).toBeNull()
  })

  it('updateScope 應更新 scope', () => {
    const key = makeDefault()
    const updated = key.activate().updateScope(AppKeyScope.write())
    expect(updated.appKeyScope.getValue()).toBe('write')
  })

  it('updateBoundModules 應更新綁定模組', () => {
    const key = makeDefault()
    const updated = key.activate().updateBoundModules(BoundModules.from(['mod-3']))
    expect(updated.boundModules.getModuleIds()).toEqual(['mod-3'])
  })

  it('已撤銷的 Key 不能更新 scope', () => {
    const key = makeDefault()
    const revoked = key.activate().revoke()
    expect(() => revoked.updateScope(AppKeyScope.admin())).toThrow()
  })

  it('AppApiKeyMapper.toDatabaseRow 應正確轉換為 snake_case', () => {
    const key = AppApiKey.create({
      id: 'appkey-1',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'My SDK Key',
      gatewayKeyId: 'bfr-vk-app-1',
      keyHash: defaultHash,
      scope: AppKeyScope.write(),
      boundModules: BoundModules.from(['mod-1']),
    })
    const row = AppApiKeyMapper.toDatabaseRow(key)
    expect(row.id).toBe('appkey-1')
    expect(row.org_id).toBe('org-1')
    expect(row.issued_by_user_id).toBe('user-1')
    expect(row.label).toBe('My SDK Key')
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(row.status).toBe('pending')
    expect(row.scope).toBe('write')
    expect(row.bound_modules).toBe('["mod-1"]')
    expect(row.previous_key_hash).toBeNull()
    expect(row.grace_period_ends_at).toBeNull()
  })

  it('fromDatabase 應正確重建', () => {
    const key = makeDefault()
    const row = AppApiKeyMapper.toDatabaseRow(key)
    const rebuilt = AppApiKey.fromDatabase(row)
    expect(rebuilt.id).toBe('appkey-1')
    expect(rebuilt.label).toBe('My SDK Key')
    expect(rebuilt.status).toBe('pending')
    expect(rebuilt.appKeyScope.getValue()).toBe('read')
  })

  it('AppApiKeyPresenter 應使用 camelCase 且隱藏 hash', () => {
    const key = makeDefault()
    const dto = AppApiKeyPresenter.fromEntity(key)
    expect(dto.id).toBe('appkey-1')
    expect(dto.orgId).toBe('org-1')
    expect(dto.keyPrefix).toMatch(/^drp_app_\.\.\./)
    expect(dto.scope).toBe('read')
    expect(dto).not.toHaveProperty('keyHash')
  })
})
