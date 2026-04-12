import { afterEach, describe, expect, it, vi } from 'vitest'
import { EvaluateThresholdsService } from '../Application/Services/EvaluateThresholdsService'
import { AlertConfig } from '../Domain/Aggregates/AlertConfig'
import { MonthlyPeriod } from '../Domain/ValueObjects/MonthlyPeriod'
import { ThresholdTier } from '../Domain/ValueObjects/ThresholdTier'

type AlertConfigRepoMock = {
  findByOrgId: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

type UsageRepoMock = {
  queryStatsByOrg: ReturnType<typeof vi.fn>
  queryStatsByKey: ReturnType<typeof vi.fn>
}

type ApiKeyRepoMock = {
  findByOrgId: ReturnType<typeof vi.fn>
}

type SendAlertServiceMock = {
  send: ReturnType<typeof vi.fn>
}

function buildService() {
  const alertConfigRepo: AlertConfigRepoMock = {
    findByOrgId: vi.fn(),
    update: vi.fn(),
  }
  const usageRepo: UsageRepoMock = {
    queryStatsByOrg: vi.fn(),
    queryStatsByKey: vi.fn(),
  }
  const apiKeyRepo: ApiKeyRepoMock = {
    findByOrgId: vi.fn(),
  }
  const sendAlertService: SendAlertServiceMock = {
    send: vi.fn(),
  }

  const service = new EvaluateThresholdsService(
    alertConfigRepo as never,
    usageRepo as never,
    apiKeyRepo as never,
    sendAlertService as never,
  )

  return { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService }
}

function setCurrentMonth(month: string): void {
  vi.spyOn(MonthlyPeriod, 'current').mockReturnValue(MonthlyPeriod.fromString(month))
}

describe('EvaluateThresholdsService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips orgs with no AlertConfig', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    alertConfigRepo.findByOrgId.mockResolvedValue(null)

    await service.evaluateOrgs(['org-1'])

    expect(alertConfigRepo.findByOrgId).toHaveBeenCalledWith('org-1')
    expect(usageRepo.queryStatsByOrg).not.toHaveBeenCalled()
    expect(apiKeyRepo.findByOrgId).not.toHaveBeenCalled()
    expect(sendAlertService.send).not.toHaveBeenCalled()
  })

  it('sends a warning alert when usage reaches 85% without prior alert', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 85 })
    apiKeyRepo.findByOrgId.mockResolvedValue([
      { id: 'key-1', label: 'Primary' },
      { id: 'key-2', label: 'Secondary' },
      { id: 'key-3', label: 'Idle' },
    ])
    usageRepo.queryStatsByKey.mockImplementation(async (keyId: string) => {
      if (keyId === 'key-1') return { totalCost: 55 }
      if (keyId === 'key-2') return { totalCost: 30 }
      return { totalCost: 0 }
    })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).toHaveBeenCalledTimes(1)
    expect(sendAlertService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        tier: ThresholdTier.WARNING.value,
        budgetUsd: '100.00',
        actualCostUsd: '85',
        percentage: '85.0',
        month: '2026-04',
        keyBreakdown: [
          { label: 'Primary', costUsd: '55.00', percentage: '55.0' },
          { label: 'Secondary', costUsd: '30.00', percentage: '30.0' },
        ],
      }),
    )
    expect(alertConfigRepo.update).toHaveBeenCalledTimes(1)
    const updated = alertConfigRepo.update.mock.calls[0][0] as AlertConfig
    expect(updated.lastAlertedTier).toBe('warning')
    expect(updated.lastAlertedMonth).toBe('2026-04')
  })

  it('sends only a critical alert when usage jumps to 105% without prior alert', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 105 })
    apiKeyRepo.findByOrgId.mockResolvedValue([{ id: 'key-1', label: 'Primary' }])
    usageRepo.queryStatsByKey.mockResolvedValue({ totalCost: 105 })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).toHaveBeenCalledTimes(1)
    expect(sendAlertService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: ThresholdTier.CRITICAL.value,
        percentage: '105.0',
        keyBreakdown: [{ label: 'Primary', costUsd: '105.00', percentage: '105.0' }],
      }),
    )
    const updated = alertConfigRepo.update.mock.calls[0][0] as AlertConfig
    expect(updated.lastAlertedTier).toBe('critical')
  })

  it('does not re-alert warning when already warned this month', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00').markAlerted('warning', '2026-04')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 85 })
    apiKeyRepo.findByOrgId.mockResolvedValue([{ id: 'key-1', label: 'Primary' }])
    usageRepo.queryStatsByKey.mockResolvedValue({ totalCost: 85 })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).not.toHaveBeenCalled()
    expect(alertConfigRepo.update).not.toHaveBeenCalled()
  })

  it('escalates to critical when already warned this month and cost exceeds critical', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00').markAlerted('warning', '2026-04')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 105 })
    apiKeyRepo.findByOrgId.mockResolvedValue([{ id: 'key-1', label: 'Primary' }])
    usageRepo.queryStatsByKey.mockResolvedValue({ totalCost: 105 })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).toHaveBeenCalledTimes(1)
    expect(sendAlertService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: ThresholdTier.CRITICAL.value,
        percentage: '105.0',
      }),
    )
    const updated = alertConfigRepo.update.mock.calls[0][0] as AlertConfig
    expect(updated.lastAlertedTier).toBe('critical')
  })

  it('does not re-alert when already critical this month', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00').markAlerted('critical', '2026-04')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 105 })
    apiKeyRepo.findByOrgId.mockResolvedValue([{ id: 'key-1', label: 'Primary' }])
    usageRepo.queryStatsByKey.mockResolvedValue({ totalCost: 105 })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).not.toHaveBeenCalled()
    expect(alertConfigRepo.update).not.toHaveBeenCalled()
  })

  it('resets dedup state in a new month', async () => {
    setCurrentMonth('2026-04')
    const { service, alertConfigRepo, usageRepo, apiKeyRepo, sendAlertService } = buildService()
    const config = AlertConfig.create('cfg-1', 'org-1', '100.00').markAlerted('warning', '2026-03')

    alertConfigRepo.findByOrgId.mockResolvedValue(config)
    usageRepo.queryStatsByOrg.mockResolvedValue({ totalCost: 85 })
    apiKeyRepo.findByOrgId.mockResolvedValue([{ id: 'key-1', label: 'Primary' }])
    usageRepo.queryStatsByKey.mockResolvedValue({ totalCost: 85 })

    await service.evaluateOrgs(['org-1'])

    expect(sendAlertService.send).toHaveBeenCalledTimes(1)
    expect(sendAlertService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: ThresholdTier.WARNING.value,
        month: '2026-04',
      }),
    )
    const updated = alertConfigRepo.update.mock.calls[0][0] as AlertConfig
    expect(updated.lastAlertedMonth).toBe('2026-04')
  })
})
