import { describe, expect, it, vi } from 'vitest'
import type { TestApp } from '../TestApp'
import { scenario } from '../scenarios'

describe('scenario runner', () => {
  it('empty chain .run() resolves without throwing', async () => {
    const fakeApp = {} as TestApp
    await expect(scenario(fakeApp).run()).resolves.toBeUndefined()
  })

  it('registered step fires once on .run()', async () => {
    const fakeApp = {} as TestApp
    const builder = scenario(fakeApp)
    const step = vi.fn().mockResolvedValue(undefined)
    builder.__pushStep(step)

    await builder.run()

    expect(step).toHaveBeenCalledTimes(1)
  })

  it('.run() rethrows step failure with step index for debugging', async () => {
    const fakeApp = {} as TestApp
    const builder = scenario(fakeApp)
    builder.__pushStep(async () => {})
    builder.__pushStep(async () => {
      throw new Error('boom')
    })

    await expect(builder.run()).rejects.toThrow(/step 2/)
  })
})
