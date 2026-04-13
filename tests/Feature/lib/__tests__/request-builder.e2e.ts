import { describe, expect, it } from 'bun:test'
import { buildValidRequest } from '../request-builder'

describe('buildValidRequest', () => {
  it('generates email for string+format:email', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    }
    const result = buildValidRequest(schema)
    expect(result.email).toMatch(/@feature\.test$/)
  })

  it('generates uuid for string+format:uuid', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      required: ['id'],
    }
    const result = buildValidRequest(schema)
    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generates string with minLength+4 chars', () => {
    const schema = {
      type: 'object',
      properties: {
        password: { type: 'string', minLength: 8 },
      },
      required: ['password'],
    }
    const result = buildValidRequest(schema)
    expect((result.password as string).length).toBeGreaterThanOrEqual(12)
  })

  it('generates number for integer type', () => {
    const schema = {
      type: 'object',
      properties: {
        count: { type: 'integer' },
      },
    }
    const result = buildValidRequest(schema)
    expect(result.count).toBe(1)
  })

  it('generates boolean for boolean type', () => {
    const schema = {
      type: 'object',
      properties: {
        active: { type: 'boolean' },
      },
    }
    const result = buildValidRequest(schema)
    expect(result.active).toBe(true)
  })

  it('only generates required fields when onlyRequired is true', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
      },
      required: ['email'],
    }
    const result = buildValidRequest(schema, { onlyRequired: true })
    expect(result.email).toBeDefined()
    expect(result.name).toBeUndefined()
  })

  it('returns empty object for null schema', () => {
    expect(buildValidRequest(null)).toEqual({})
  })
})
