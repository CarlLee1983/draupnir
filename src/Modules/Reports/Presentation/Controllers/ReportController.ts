import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { ReportSchedule, type ReportType } from '../../Domain/Aggregates/ReportSchedule'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { ReportToken } from '../../Domain/ValueObjects/ReportToken'

interface CreateReportScheduleBody {
  type: ReportType
  day: number
  time: string
  timezone: string
  recipients: string[]
  enabled?: boolean
}

type UpdateReportScheduleBody = Partial<CreateReportScheduleBody>

export class ReportController {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly scheduleReportService: ScheduleReportService,
  ) {}

  async index(ctx: IHttpContext): Promise<Response> {
    const orgId = getRequiredParam(ctx, 'orgId')
    if (!orgId) {
      return ctx.json({ error: 'Missing organization ID' }, 400)
    }

    const schedules = await this.reportRepository.findByOrgId(orgId)
    return ctx.json(schedules)
  }

  async store(ctx: IHttpContext): Promise<Response> {
    try {
      const orgId = getRequiredParam(ctx, 'orgId')
      if (!orgId) {
        return ctx.json({ error: 'Missing organization ID' }, 400)
      }

      const body = await ctx.getBody<CreateReportScheduleBody>()
      const schedule = ReportSchedule.create({
        orgId,
        type: body.type,
        day: body.day,
        time: body.time,
        timezone: body.timezone,
        recipients: body.recipients,
        enabled: body.enabled ?? true,
      })

      await this.reportRepository.save(schedule)

      if (schedule.enabled) {
        await this.scheduleReportService.schedule(schedule.id)
      }

      return ctx.json(schedule, 201)
    } catch (error: unknown) {
      return ctx.json({ error: getErrorMessage(error) }, 400)
    }
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const orgId = getRequiredParam(ctx, 'orgId')
    if (!orgId) {
      return ctx.json({ error: 'Missing organization ID' }, 400)
    }

    const reportId = getRequiredParam(ctx, 'reportId')
    if (!reportId) {
      return ctx.json({ error: 'Missing report ID' }, 400)
    }

    const schedule = await this.reportRepository.findById(reportId)
    if (!schedule) {
      return ctx.json({ error: 'Report schedule not found' }, 404)
    }
    if (schedule.orgId !== orgId) {
      return ctx.json({ error: 'Forbidden' }, 403)
    }

    try {
      const body = await ctx.getBody<UpdateReportScheduleBody>()
      const updatedSchedule = ReportSchedule.create({
        id: schedule.id,
        orgId: schedule.orgId,
        type: body.type ?? schedule.type,
        day: body.day ?? schedule.day,
        time: body.time ?? schedule.time,
        timezone: body.timezone ?? schedule.timezone,
        recipients: body.recipients ?? schedule.recipients,
        enabled: body.enabled ?? schedule.enabled,
      })

      await this.reportRepository.save(updatedSchedule)

      if (updatedSchedule.enabled) {
        await this.scheduleReportService.schedule(updatedSchedule.id)
      } else {
        this.scheduleReportService.stop(updatedSchedule.id)
      }

      return ctx.json(updatedSchedule)
    } catch (error: unknown) {
      return ctx.json({ error: getErrorMessage(error) }, 400)
    }
  }

  async destroy(ctx: IHttpContext): Promise<Response> {
    const orgId = getRequiredParam(ctx, 'orgId')
    if (!orgId) {
      return ctx.json({ error: 'Missing organization ID' }, 400)
    }

    const reportId = getRequiredParam(ctx, 'reportId')
    if (!reportId) {
      return ctx.json({ error: 'Missing report ID' }, 400)
    }

    const schedule = await this.reportRepository.findById(reportId)
    if (!schedule) {
      return ctx.json({ error: 'Report schedule not found' }, 404)
    }
    if (schedule.orgId !== orgId) {
      return ctx.json({ error: 'Forbidden' }, 403)
    }

    await this.reportRepository.delete(schedule.id)
    this.scheduleReportService.stop(schedule.id)

    return new Response(null, { status: 204 })
  }

  async verifyTemplate(ctx: IHttpContext): Promise<Response> {
    const token = ctx.query.token as string
    if (!token) {
      return ctx.json({ error: 'Missing report token' }, 401)
    }

    const payload = await ReportToken.verify(token)
    if (!payload) {
      return ctx.json({ error: 'Invalid or expired report token' }, 401)
    }

    return ctx.json({ valid: true, orgId: payload.orgId, scheduleId: payload.scheduleId })
  }
}

function getRequiredParam(ctx: IHttpContext, name: 'orgId' | 'reportId'): string | undefined {
  const value = ctx.getParam(name)
  return value && value.length > 0 ? value : undefined
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
