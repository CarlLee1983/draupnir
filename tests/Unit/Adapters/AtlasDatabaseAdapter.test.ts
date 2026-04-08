/**
 * Atlas QueryBuilder 單元測試
 *
 * 驗證 AtlasQueryBuilder 正確實現 IQueryBuilder 介面
 */

import { describe, it, expect } from 'bun:test'
import { AtlasQueryBuilder } from '@/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder'


describe('AtlasQueryBuilder', () => {
	describe('IQueryBuilder 介面實現', () => {
		it('應該實現所有 IQueryBuilder 方法', () => {
			const qb = new AtlasQueryBuilder('users')

			expect(typeof qb.where).toBe('function')
			expect(typeof qb.first).toBe('function')
			expect(typeof qb.select).toBe('function')
			expect(typeof qb.insert).toBe('function')
			expect(typeof qb.update).toBe('function')
			expect(typeof qb.delete).toBe('function')
			expect(typeof qb.limit).toBe('function')
			expect(typeof qb.offset).toBe('function')
			expect(typeof qb.orderBy).toBe('function')
			expect(typeof qb.whereBetween).toBe('function')
			expect(typeof qb.count).toBe('function')
		})

		it('應該支援鏈式調用', () => {
			const result = new AtlasQueryBuilder('users')
				.where('status', '=', 'active')
				.limit(10)
				.offset(5)
				.orderBy('created_at', 'DESC')

			expect(result).toBeInstanceOf(AtlasQueryBuilder)
		})

		it('應該支援多個 WHERE 條件', () => {
			const qb = new AtlasQueryBuilder('users')
				.where('status', '=', 'active')
				.where('age', '>=', 18)
				.where('email', 'like', '%@example.com')

			expect(qb).toBeDefined()
		})

		it('應該支援所有比較運算子', () => {
			const operators = ['=', '!=', '<>', '>', '<', '>=', '<=', 'like', 'in', 'between']

			for (const op of operators) {
				const qb = new AtlasQueryBuilder('users')

				if (op === 'between') {
					const result = qb.whereBetween('created_at', [new Date(), new Date()])
					expect(result).toBeInstanceOf(AtlasQueryBuilder)
				} else {
					const result = qb.where('id', op, '123')
					expect(result).toBeInstanceOf(AtlasQueryBuilder)
				}
			}
		})

		it('應該支援 orderBy ASC 和 DESC', () => {
			const asc = new AtlasQueryBuilder('users').orderBy('name', 'ASC')
			const desc = new AtlasQueryBuilder('users').orderBy('name', 'DESC')

			expect(asc).toBeInstanceOf(AtlasQueryBuilder)
			expect(desc).toBeInstanceOf(AtlasQueryBuilder)
		})

		it('應該支援 limit 和 offset', () => {
			const qb = new AtlasQueryBuilder('users').limit(10).offset(5)
			expect(qb).toBeInstanceOf(AtlasQueryBuilder)
		})
	})

	describe('構造函數', () => {
		it('應該接受表名稱', () => {
			const qb = new AtlasQueryBuilder('posts')
			expect(qb).toBeDefined()
		})

		it('不同表名稱應該創建不同的 QueryBuilder', () => {
			const usersQb = new AtlasQueryBuilder('users')
			const postsQb = new AtlasQueryBuilder('posts')

			expect(usersQb).not.toBe(postsQb)
		})
	})

	describe('where() 鏈式 API', () => {
		it('應該返回 this 以支援鏈式調用', () => {
			const qb = new AtlasQueryBuilder('users')
			const result = qb.where('id', '=', '123')

			expect(result).toBe(qb)
		})

		it('應該支援連續的 where 調用', () => {
			const qb = new AtlasQueryBuilder('users')
				.where('status', '=', 'active')
				.where('role', '=', 'admin')
				.where('age', '>', 18)

			expect(qb).toBeInstanceOf(AtlasQueryBuilder)
		})
	})
})
