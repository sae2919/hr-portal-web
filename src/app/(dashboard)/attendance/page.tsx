'use client';

import { useState, useEffect } from 'react';
import { useAttendance, useSaveAttendance, useUpdateAttendance, useDeleteAttendance, useMonthlyReport } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { Attendance, StoreAttendancePayload } from '@/types/attendance';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Loader2, Clock,
  X, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── Status config ─────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  present:  { label: 'Present',  color: 'bg-green-50 text-green-700 border-green-100' },
  absent:   { label: 'Absent',   color: 'bg-red-50 text-red-600 border-red-100' },
  late:     { label: 'Late',     color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  half_day: { label: 'Half Day', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  holiday:  { label: 'Holiday',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
};

// ── Attendance Form Modal ─────────────────────────────────────────
const schema = z.object({
  employee_id:    z.number({ required_error: 'Select employee' }),
  date:           z.string().min(1, 'Date is required'),
  check_in:       z.string().optional().or(z.literal('')),
  check_out:      z.string().optional().or(z.literal('')),
  status:         z.enum(['present', 'absent', 'late', 'half_day', 'holiday']),
  overtime_hours: z.number().min(0).max(12).optional(),
  note:           z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

function AttendanceModal({ open, onClose, attendance }: {
  open: boolean;
  onClose: () => void;
  attendance?: Attendance | null;
}) {
  const isEdit = !!attendance;
  const { mutate: save,   isPending: saving   } = useSaveAttendance();
  const { mutate: update, isPending: updating } = useUpdateAttendance();
  const { data: employees = [] } = useEmployees();

  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id:    attendance?.employee_id ?? undefined,
      date:           attendance?.date        ?? today,
      check_in:       attendance?.check_in    ?? '09:00',
      check_out:      attendance?.check_out   ?? '18:00',
      status:         attendance?.status      ?? 'present',
      overtime_hours: attendance?.overtime_hours ?? 0,
      note:           attendance?.note        ?? '',
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: StoreAttendancePayload = {
      employee_id:    data.employee_id,
      date:           data.date,
      check_in:       data.check_in || undefined,
      check_out:      data.check_out || undefined,
      status:         data.status,
      overtime_hours: data.overtime_hours ?? 0,
      note:           data.note || undefined,
    };

    if (isEdit && attendance) {
      update({ id: attendance.id, ...payload }, {
        onSuccess: () => { onClose(); reset(); },
      });
    } else {
      save(payload, {
        onSuccess: () => { onClose(); reset(); },
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isEdit ? 'Edit Attendance' : 'Mark Attendance'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update record' : 'Add attendance record'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Employee <span className="text-red-500">*</span>
              </Label>
              <select
                {...register('employee_id', { valueAsNumber: true })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_code})
                  </option>
                ))}
              </select>
              {errors.employee_id && (
                <p className="text-red-500 text-xs">{errors.employee_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input type="date" {...register('date')} className="h-10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Check In</Label>
              <Input type="time" {...register('check_in')} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Check Out</Label>
              <Input type="time" {...register('check_out')} className="h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Status</Label>
            <select
              {...register('status')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Overtime Hours</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="12"
              {...register('overtime_hours', { valueAsNumber: true })}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Note</Label>
            <textarea
              {...register('note')}
              rows={2}
              placeholder="Optional note..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || updating}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {(saving || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Monthly Report Tab ────────────────────────────────────────────
function MonthlyReportTab({ month, year }: { month: number; year: number }) {
  const { data, isLoading } = useMonthlyReport(month, year);

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">
          Monthly Report — {monthName} {year}
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-5 py-3 font-medium text-slate-500">Employee</th>
            <th className="text-left px-5 py-3 font-medium text-slate-500">Department</th>
            <th className="text-center px-4 py-3 font-medium text-green-600">Present</th>
            <th className="text-center px-4 py-3 font-medium text-red-500">Absent</th>
            <th className="text-center px-4 py-3 font-medium text-yellow-600">Late</th>
            <th className="text-center px-4 py-3 font-medium text-orange-600">Half Day</th>
            <th className="text-center px-4 py-3 font-medium text-slate-500">OT Hrs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {isLoading ? (
            <tr>
              <td colSpan={7} className="text-center py-10">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </td>
            </tr>
          ) : (
            data?.data.map((row) => (
              <tr key={row.employee_id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-700">{row.full_name}</p>
                  <p className="text-xs text-slate-400">{row.employee_code}</p>
                </td>
                <td className="px-5 py-3 text-slate-500 text-sm">{row.department ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-600 font-semibold">{row.present}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-red-500 font-semibold">{row.absent}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-yellow-600 font-semibold">{row.late}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-orange-600 font-semibold">{row.half_day}</span>
                </td>
                <td className="px-4 py-3 text-center text-slate-500">
                  {Number(row.overtime_hours).toFixed(1)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AttendancePage() {
  const today    = new Date().toISOString().split('T')[0];
  const nowMonth = new Date().getMonth() + 1;
  const nowYear  = new Date().getFullYear();

  const [tab, setTab]               = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setDate]     = useState(today);
  const [month, setMonth]           = useState(nowMonth);
  const [year, setYear]             = useState(nowYear);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState<Attendance | null>(null);
  const [mounted, setMounted]       = useState(false);
  const { hasPermission }           = useAuthStore();

  useEffect(() => setMounted(true), []);

  const canManage = mounted && hasPermission('manage attendance');

  const { data: records = [], isLoading } = useAttendance({
    date:          tab === 'daily' ? selectedDate : undefined,
    month:         tab === 'monthly' ? month : undefined,
    year:          tab === 'monthly' ? year : undefined,
    status:        filterStatus || undefined,
    department_id: filterDept ? Number(filterDept) : undefined,
  });

  const { data: departments = [] } = useDepartments();
  const { mutate: deleteRecord } = useDeleteAttendance();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Stats for daily view
  const stats = {
    present:  records.filter(r => r.status === 'present').length,
    absent:   records.filter(r => r.status === 'absent').length,
    late:     records.filter(r => r.status === 'late').length,
    half_day: records.filter(r => r.status === 'half_day').length,
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-400">Track employee attendance</p>
        </div>
        {canManage && (
          <Button
            onClick={() => { setEditRecord(null); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <Plus size={16} /> Mark Attendance
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('daily')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'daily'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setTab('monthly')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'monthly'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={14} /> Monthly Report
        </button>
      </div>

      {tab === 'daily' ? (
        <>
          {/* Daily Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-44"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Present',  count: stats.present,  color: 'text-green-600',  bg: 'bg-green-50' },
              { label: 'Absent',   count: stats.absent,   color: 'text-red-500',    bg: 'bg-red-50' },
              { label: 'Late',     count: stats.late,     color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Half Day', count: stats.half_day, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
              </div>
            ))}
          </div>

          {/* Daily Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Department</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Check In</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Check Out</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Hours</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
                  {canManage && (
                    <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Clock className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm">No attendance records for this date</p>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">{record.employee?.full_name}</p>
                        <p className="text-xs text-slate-400">{record.employee?.employee_code}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">
                        {record.employee?.department ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-700 font-mono text-xs">
                          {record.check_in ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-700 font-mono text-xs">
                          {record.check_out ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-600 font-mono text-xs">
                          {record.worked_hours ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={statusConfig[record.status]?.color ?? ''}>
                          {statusConfig[record.status]?.label ?? record.status}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditRecord(record); setModalOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 w-36 text-center">
              {monthName} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <MonthlyReportTab month={month} year={year} />
        </>
      )}

      <AttendanceModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        attendance={editRecord}
      />
    </div>
  );
}