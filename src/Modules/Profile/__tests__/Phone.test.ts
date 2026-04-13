import { describe, expect, it } from 'vitest'
import { Phone } from '../Domain/ValueObjects/Phone'

describe('Phone Value Object', () => {
  it('應接受有效的電話號碼', () => {
    const phone = new Phone('+886912345678')
    expect(phone.getValue()).toBe('+886912345678')
  })

  it('應接受含空格和橫線的號碼', () => {
    const phone = new Phone('+886-912-345-678')
    expect(phone.getValue()).toBe('+886912345678')
  })

  it('應接受空值（選填欄位）', () => {
    const phone = Phone.fromNullable(null)
    expect(phone).toBeNull()
  })

  it('應接受空字串（選填欄位）', () => {
    const phone = Phone.fromNullable('')
    expect(phone).toBeNull()
  })

  it('應拒絕太短的號碼', () => {
    expect(() => new Phone('123')).toThrow()
  })

  it('應拒絕太長的號碼', () => {
    expect(() => new Phone('+8869999999999999999')).toThrow()
  })
})
