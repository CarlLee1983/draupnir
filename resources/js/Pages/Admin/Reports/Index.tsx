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
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      return days[day - 1] || day
    }
    return `Day ${day}`
  }

  return (
    <AdminLayout>
      <Head title="Automated Reports" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Automated Reports</h1>
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Report
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[540px]">
              <SheetHeader>
                <SheetTitle>{editingSchedule ? 'Edit Report Schedule' : 'Schedule New Report'}</SheetTitle>
                <SheetDescription>
                  Configure automated cost and usage reports for this organization.
                </SheetDescription>
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
            <CardTitle>Active Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No reports scheduled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="capitalize">{schedule.type}</TableCell>
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
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
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
