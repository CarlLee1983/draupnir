import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Mail, Calendar, Clock, Globe, Trash2, Edit, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { ReportForm } from './Components/ReportForm'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useTranslation } from '@/lib/i18n'

interface ReportScheduleRow {
  id: string
  type: 'weekly' | 'monthly'
  day: number
  time: string
  timezone: string
  recipients: string[]
  enabled: boolean
  cronString: string
}

interface Props {
  orgId: string
  schedules: ReportScheduleRow[]
}

export default function ReportsIndex({ orgId, schedules }: Props) {
  const { t } = useTranslation()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReportScheduleRow | null>(null)

  const handleEdit = (schedule: ReportScheduleRow) => {
    setEditingSchedule(schedule)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setEditingSchedule(null)
    setIsFormOpen(true)
  }

  const getDayName = (type: string, day: number) => {
    if (type === 'weekly') {
      const days = [
        t('ui.admin.reports.monday'),
        t('ui.admin.reports.tuesday'),
        t('ui.admin.reports.wednesday'),
        t('ui.admin.reports.thursday'),
        t('ui.admin.reports.friday'),
        t('ui.admin.reports.saturday'),
        t('ui.admin.reports.sunday'),
      ]
      return days[day - 1] || day
    }
    return t('ui.admin.reports.dayOfLabel', { day })
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.reports.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.admin.reports.title')}</h1>
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('ui.admin.reports.scheduleButton')}
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[540px]">
              <SheetHeader>
                <SheetTitle>
                  {editingSchedule
                    ? t('ui.admin.reports.formTitleEdit')
                    : t('ui.admin.reports.formTitleCreate')}
                </SheetTitle>
                <SheetDescription>{t('ui.admin.reports.formDescription')}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <ReportForm 
                  orgId={orgId} 
                  initialData={editingSchedule} 
                  onSuccess={() => setIsFormOpen(false)} 
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.admin.reports.activeSchedulesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ui.admin.reports.tableFrequency')}</TableHead>
                  <TableHead>{t('ui.admin.reports.tableSchedule')}</TableHead>
                  <TableHead>{t('ui.admin.reports.tableTimezone')}</TableHead>
                  <TableHead>{t('ui.admin.reports.tableRecipients')}</TableHead>
                  <TableHead>{t('ui.admin.reports.tableStatus')}</TableHead>
                  <TableHead className="text-right">{t('ui.admin.reports.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t('ui.admin.reports.emptyState')}
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="capitalize">
                        {schedule.type === 'weekly' 
                          ? t('ui.admin.reports.freqWeekly') 
                          : t('ui.admin.reports.freqMonthly')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {getDayName(schedule.type, schedule.day)}
                          </span>
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {schedule.time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center text-xs">
                          <Globe className="mr-1 h-3 w-3" />
                          {schedule.timezone}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {schedule.recipients.map((email) => (
                            <Badge key={email} variant="outline" className="font-normal">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.enabled ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                            {t('ui.admin.reports.statusEnabled')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('ui.admin.reports.statusDisabled')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
