import { describe, expect, it, mock } from 'bun:test'
import { AtlasQueryBuilder } from '../AtlasQueryBuilder'

describe('AtlasQueryBuilder (Mocked)', () => {
  const createMockQuery = () => {
    const query: any = {}
    query.get = mock(() => Promise.resolve([]))
    query.first = mock(() => Promise.resolve(null))
    query.where = mock(() => query)
    query.whereIn = mock(() => query)
    query.whereBetween = mock(() => query)
    query.orderBy = mock(() => query)
    query.limit = mock(() => query)
    query.offset = mock(() => query)
    query.update = mock(() => Promise.resolve())
    query.delete = mock(() => Promise.resolve())
    query.insert = mock(() => Promise.resolve())
    query.count = mock(() => Promise.resolve(10))
    return query
  }

  const createMockConnection = (query: any) => ({
    table: mock(() => query),
    raw: mock(() => Promise.resolve([])),
  })

  it('should apply where conditions correctly', async () => {
    const mockQuery = createMockQuery()
    const conn = createMockConnection(mockQuery)
    const qb = new AtlasQueryBuilder('test_table', conn)

    await qb.where('id', '=', 1).where('status', 'in', ['active']).select()

    expect(conn.table).toHaveBeenCalledWith('test_table')
    expect(mockQuery.where).toHaveBeenCalledWith('id', '=', 1)
    expect(mockQuery.whereIn).toHaveBeenCalledWith('status', ['active'])
    expect(mockQuery.get).toHaveBeenCalled()
  })

  it('should support first() with orderBy and limit', async () => {
    const mockQuery = createMockQuery()
    const conn = createMockConnection(mockQuery)
    const qb = new AtlasQueryBuilder('test_table', conn)

    await qb.orderBy('created_at', 'DESC').first()

    expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc')
    expect(mockQuery.first).toHaveBeenCalled()
  })

  it('should support CRUD operations', async () => {
    const mockQuery = createMockQuery()
    const conn = createMockConnection(mockQuery)
    const qb = new AtlasQueryBuilder('test_table', conn)

    await qb.insert({ name: 'test' })
    expect(mockQuery.insert).toHaveBeenCalledWith({ name: 'test' })

    await qb.where('id', '=', 1).update({ name: 'updated' })
    expect(mockQuery.update).toHaveBeenCalledWith({ name: 'updated' })

    await qb.where('id', '=', 2).delete()
    expect(mockQuery.delete).toHaveBeenCalled()
  })

  it('should support count()', async () => {
    const mockQuery = createMockQuery()
    const conn = createMockConnection(mockQuery)
    const qb = new AtlasQueryBuilder('test_table', conn)

    const total = await qb.count()
    expect(total).toBe(10)
    expect(mockQuery.count).toHaveBeenCalled()
  })
})
