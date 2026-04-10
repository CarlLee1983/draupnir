import { describe, it, expect } from 'vitest'
import { OrgSlug } from '../Domain/ValueObjects/OrgSlug'

describe('OrgSlug Value Object', () => {
  it('應接受有效的 slug', () => {
    const slug = new OrgSlug('my-org-123')
    expect(slug.getValue()).toBe('my-org-123')
  })

  it('應自動轉換為小寫', () => {
    const slug = new OrgSlug('My-Org')
    expect(slug.getValue()).toBe('my-org')
  })

  it('應從名稱自動產生 slug', () => {
    const slug = OrgSlug.fromName('My Organization')
    expect(slug.getValue()).toBe('my-organization')
  })

  it('應從名稱移除特殊字元', () => {
    const slug = OrgSlug.fromName('CMG 科技公司 #1')
    expect(slug.getValue()).toMatch(/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/)
  })

  it('純非 ASCII 名稱應產生帶隨機後綴的 slug 而非固定值', () => {
    const slug1 = OrgSlug.fromName('科技公司')
    const slug2 = OrgSlug.fromName('科技公司')
    expect(slug1.getValue()).toMatch(/^org-[a-z0-9]+$/)
    expect(slug1.getValue()).not.toBe(slug2.getValue())
  })

  it('含拉丁字母的帶音標名稱應正確轉換', () => {
    const slug = OrgSlug.fromName('Café Résumé')
    expect(slug.getValue()).toBe('cafe-resume')
  })

  it('應拒絕空 slug', () => {
    expect(() => new OrgSlug('')).toThrow()
  })

  it('應拒絕含有非法字元的 slug', () => {
    expect(() => new OrgSlug('my org!')).toThrow()
  })

  it('應拒絕超過 100 字元的 slug', () => {
    expect(() => new OrgSlug('a'.repeat(101))).toThrow()
  })
})
