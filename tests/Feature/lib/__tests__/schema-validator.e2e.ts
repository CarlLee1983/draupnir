import { describe, expect, it } from 'bun:test'
import { validateSchema } from '../schema-validator'

describe('validateSchema', () => {
  it('passes for valid data', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }
    const result = validateSchema({ name: 'hello' }, schema, {})
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('fails for missing required field', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }
    const result = validateSchema({}, schema, {})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('fails for wrong type', () => {
    const schema = {
      type: 'object',
      properties: { count: { type: 'integer' } },
    }
    const result = validateSchema({ count: 'not-a-number' }, schema, {})
    expect(result.valid).toBe(false)
  })

  it('validates email format', () => {
    const schema = {
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
    }
    const good = validateSchema({ email: 'a@b.com' }, schema, {})
    expect(good.valid).toBe(true)

    const bad = validateSchema({ email: 'not-email' }, schema, {})
    expect(bad.valid).toBe(false)
  })

  it('resolves $ref from component schemas', () => {
    const schema = { $ref: '#/components/schemas/Foo' }
    const components = {
      Foo: {
        type: 'object',
        properties: { x: { type: 'number' } },
        required: ['x'],
      },
    }
    const good = validateSchema({ x: 1 }, schema, components)
    expect(good.valid).toBe(true)

    const bad = validateSchema({}, schema, components)
    expect(bad.valid).toBe(false)
  })
})
