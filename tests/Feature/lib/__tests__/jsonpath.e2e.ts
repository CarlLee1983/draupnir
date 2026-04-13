import { describe, expect, it } from 'bun:test'
import { extractValue, resolveRef, resolveRefs } from '../jsonpath'

describe('extractValue', () => {
  const obj = {
    data: {
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'tok123',
    },
    meta: { total: 5 },
  }

  it('extracts nested value with $.dot.path', () => {
    expect(extractValue(obj, '$.data.user.id')).toBe('u1')
  })

  it('extracts top-level value', () => {
    expect(extractValue(obj, '$.meta.total')).toBe(5)
  })

  it('returns undefined for missing path', () => {
    expect(extractValue(obj, '$.data.missing.field')).toBeUndefined()
  })

  it('handles null input gracefully', () => {
    expect(extractValue(null, '$.a.b')).toBeUndefined()
  })
})

describe('resolveRef', () => {
  const context = { token: 'abc', userId: 'u1' }

  it('resolves $.token from context', () => {
    expect(resolveRef('$.token', context)).toBe('abc')
  })

  it('returns literal string as-is', () => {
    expect(resolveRef('hello', context)).toBe('hello')
  })
})

describe('resolveRefs', () => {
  const context = { token: 'abc', userId: 'u1' }

  it('resolves $. references in object values', () => {
    const input = { name: 'Test', managerId: '$.userId' }
    expect(resolveRefs(input, context)).toEqual({ name: 'Test', managerId: 'u1' })
  })

  it('returns undefined for undefined input', () => {
    expect(resolveRefs(undefined, context)).toBeUndefined()
  })

  it('does not mutate original object', () => {
    const input = { a: '$.token' }
    const result = resolveRefs(input, context)
    expect(input.a).toBe('$.token')
    expect(result).toEqual({ a: 'abc' })
  })
})
