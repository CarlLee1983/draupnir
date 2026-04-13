import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { type IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { ReportSchedule } from '../../Domain/Aggregates/ReportSchedule'
import { type ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { ReportToken } from '../../Domain/ValueObjects/ReportToken'

export class ReportController {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly scheduleReportService: ScheduleReportService
  ) {}

  async index(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getParam('orgId')!
    const schedules = await this.reportRepository.findByOrgId(orgId)
    return ctx.json(schedules)
  }

  async store(ctx: IHttpContext): Promise<Response> {
    try {
      const orgId = ctx.getParam('orgId')!
      const body = await ctx.getBody<any>()
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
    } catch (error: any) {
      return ctx.json({ error: error.message }, 400)
    }
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const id = ctx.getParam('id')!
    const schedule = await this.reportRepository.findById(id)
    if (!schedule) {
      return ctx.json({ error: 'Report schedule not found' }, 404)
    }

    try {
      const body = await ctx.getBody<any>()
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
    } catch (error: any) {
      return ctx.json({ error: error.message }, 400)
    }
  }

  async destroy(ctx: IHttpContext): Promise<Response> {
    const id = ctx.getParam('id')!
    const schedule = await this.reportRepository.findById(id)
    if (!schedule) {
      return ctx.json({ error: 'Report schedule not found' }, 404)
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

    return ctx.json({ valid: true, orgId: payload.orgId })
  }
}
