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
    expect(sql).toContain('WHERE "status" = ?');
    expect(sql).toContain('GROUP BY "user_id"');
    expect(sql).toContain('ORDER BY "total_value" DESC');
    expect(sql).toContain('LIMIT 5');
    expect(bindings).toEqual(['completed']);
  });
});
