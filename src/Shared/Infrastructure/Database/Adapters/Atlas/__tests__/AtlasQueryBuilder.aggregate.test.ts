import { describe, expect, it, mock } from 'bun:test';
import { AtlasQueryBuilder } from '../AtlasQueryBuilder';

describe('AtlasQueryBuilder Aggregates', () => {
  const createMockConnection = () => {
    const rawResult: any = { rows: [{ total_value: 100 }] };
    return {
      table: mock(() => ({})),
      raw: mock(() => Promise.resolve(rawResult)),
    };
  };

  it('should compile complex aggregate SQL correctly', async () => {
    const conn = createMockConnection();
    const qb = new AtlasQueryBuilder('orders', conn);

    await qb.where('status', '=', 'completed').aggregate({
      select: {
        total_value: { kind: 'sum', column: 'amount' },
        avg_value: { kind: 'avg', column: 'amount' },
        count_all: { kind: 'count', column: '*' }
      },
      groupBy: ['user_id'],
      orderBy: [{ column: 'total_value', direction: 'DESC' }],
      limit: 5
    });

    const [sql, bindings] = (conn.raw as any).mock.calls[0];
    
    expect(sql).toContain('SELECT SUM("amount") AS "total_value"');
    expect(sql).toContain('AVG("amount") AS "avg_value"');
    expect(sql).toContain('COUNT(*) AS "count_all"');
    expect(sql).toContain('FROM "orders"');
    expect(sql).toContain('WHERE "status" = $1');
    expect(sql).toContain('GROUP BY "user_id"');
    expect(sql).toContain('ORDER BY "total_value" DESC');
    expect(sql).toContain('LIMIT 5');
    expect(bindings).toEqual(['completed']);
  });

  it('compiles IN list + BETWEEN for member-scoped usage aggregates (no invalid `in ?` before AND)', async () => {
    const conn = createMockConnection();
    const qb = new AtlasQueryBuilder('usage_records', conn);

    await qb
      .where('api_key_id', 'in', ['key-a', 'key-b'])
      .whereBetween('occurred_at', ['2026-04-01T00:00:00Z', '2026-04-15T23:59:59Z'] as any)
      .aggregate({
        select: {
          total: { kind: 'sum', column: 'credit_cost' },
        },
      });

    const [sql, bindings] = (conn.raw as any).mock.calls[0];

    expect(sql).toContain('"api_key_id" IN ($1, $2)');
    expect(sql).toContain('"occurred_at" BETWEEN $3 AND $4');
    expect(sql).toMatch(/WHERE .+ AND .+/);
    expect(bindings).toEqual(['key-a', 'key-b', '2026-04-01T00:00:00Z', '2026-04-15T23:59:59Z']);
  });

  it('empty IN array yields unsatisfiable predicate', async () => {
    const conn = createMockConnection();
    const qb = new AtlasQueryBuilder('usage_records', conn);

    await qb.where('api_key_id', 'in', []).aggregate({
      select: { total: { kind: 'count', column: '*' } },
    });

    const [sql] = (conn.raw as any).mock.calls[0];
    expect(sql).toContain('WHERE 1 = 0');
  });
});
