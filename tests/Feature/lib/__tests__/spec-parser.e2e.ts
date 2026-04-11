import { describe, it, expect } from 'bun:test'
import { parseOpenAPI } from '../spec-parser'
import { resolve } from 'path'

const SPEC_PATH = resolve(import.meta.dir, '../../../../docs/openapi.yaml')

describe('parseOpenAPI', () => {
  it('parses the spec file without errors', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec).toBeDefined()
    expect(spec.operations.length).toBeGreaterThan(0)
  })

  it('extracts method and path for each operation', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    for (const op of spec.operations) {
      expect(['get', 'post', 'put', 'patch', 'delete']).toContain(op.method)
      expect(op.path).toMatch(/^\//)
    }
  })

  it('detects security requirement on protected endpoints', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const getMe = spec.operations.find((op) => op.method === 'get' && op.path === '/api/users/me')
    expect(getMe?.requiresAuth).toBe(true)
  })

  it('detects public endpoints without security', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.requiresAuth).toBe(false)
  })

  it('extracts requestSchema with required fields', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.requestSchema).toBeDefined()
    expect(register?.requiredFields).toContain('email')
    expect(register?.requiredFields).toContain('password')
  })

  it('extracts successStatus from first 2xx response', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.successStatus).toBe(201)
  })

  it('extracts x-test-role when present', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const createOrg = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/organizations',
    )
    expect(createOrg?.testRole).toBe('admin')
  })

  it('extracts x-test-flows when present', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec.flows).toBeDefined()
    expect(Object.keys(spec.flows).length).toBeGreaterThan(0)
  })

  it('extracts component schemas for $ref resolution', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec.componentSchemas).toBeDefined()
    expect(spec.componentSchemas['RegisterRequest']).toBeDefined()
  })
})
