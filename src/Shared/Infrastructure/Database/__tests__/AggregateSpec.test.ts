import { describe, expect, it } from 'vitest'
import {
  type AggregateExpression,
  type AggregateSpec,
  add,
  avg,
  coalesce,
  col,
  count,
  dateTrunc,
  max,
  min,
  sum,
} from '../AggregateSpec'

describe('AggregateSpec Builders', () => {
  it('sum() produces sum kind', () => {
    expect(sum('cost')).toEqual({ kind: 'sum', column: 'cost' })
  })

  it('count() defaults to *', () => {
    expect(count()).toEqual({ kind: 'count', column: '*' })
    expect(count('id')).toEqual({ kind: 'count', column: 'id' })
  })

  it('avg() produces avg kind', () => {
    expect(avg('latency')).toEqual({ kind: 'avg', column: 'latency' })
  })

  it('min() produces min kind', () => {
    expect(min('val')).toEqual({ kind: 'min', column: 'val' })
  })

  it('max() produces max kind', () => {
    expect(max('val')).toEqual({ kind: 'max', column: 'val' })
  })

  it('dateTrunc() produces dateTrunc kind with day unit', () => {
    expect(dateTrunc('day', 'created_at')).toEqual({
      kind: 'dateTrunc',
      unit: 'day',
      column: 'created_at',
    })
  })

  it('coalesce() produces coalesce kind with operands', () => {
    expect(coalesce('latency', 0)).toEqual({
      kind: 'coalesce',
      operands: ['latency', 0],
    })
  })

  it('add() produces add kind with left and right', () => {
    expect(add('in', 'out')).toEqual({
      kind: 'add',
      left: 'in',
      right: 'out',
    })
  })

  it('col() produces column kind', () => {
    expect(col('name')).toEqual({ kind: 'column', column: 'name' })
  })

  describe('Nested Composition', () => {
    it('supports nested sum(add())', () => {
      const nested = sum(add('input', 'output'))
      expect(nested).toEqual({
        kind: 'sum',
        column: { kind: 'add', left: 'input', right: 'output' },
      })
    })

    it('supports nested avg(coalesce())', () => {
      const nested = avg(coalesce('latency', 0))
      expect(nested).toEqual({
        kind: 'avg',
        column: { kind: 'coalesce', operands: ['latency', 0] },
      })
    })

    it('supports deep nesting', () => {
      const deep = sum(coalesce(add('a', 'b'), 0))
      expect(deep).toEqual({
        kind: 'sum',
        column: {
          kind: 'coalesce',
          operands: [{ kind: 'add', left: 'a', right: 'b' }, 0],
        },
      })
    })
  })

  it('full AggregateSpec satisfies the interface', () => {
    const spec: AggregateSpec = {
      select: {
        date: dateTrunc('day', 'occurred_at'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalTokens: sum(add('input_tokens', 'output_tokens')),
      },
      groupBy: ['date'],
      orderBy: [{ column: 'date', direction: 'ASC' }],
      limit: 10,
    }

    expect(spec.select.totalTokens).toBeDefined()
    expect(spec.groupBy).toContain('date')
  })

  describe('Type-level constraints', () => {
    it('refuses unsupported dateTrunc units', () => {
      // @ts-expect-error - only 'day' is supported
      dateTrunc('year', 'created_at')
    })

    it('refuses unknown kinds', () => {
      // @ts-expect-error - 'power' is not a valid kind
      const _invalid: AggregateExpression = { kind: 'power', column: 'x' }
    })
  })
})
