'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorksheet, useSaveBulkAttendance, useMonthlyReport, WorksheetItem } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Loader2, Clock, ChevronLeft, ChevronRight, BarChart3,
  CheckSquare, Square, Save, Check, Plane,
  CalendarDays, List, CheckCircle2, XCircle,
  AlertCircle, Timer, Minus, TrendingUp, LogIn, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveRoleTier } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────
// Shared constants
// ────────────────────────────────────────────────────────────────

const statusOptions = [
  { value: 'present',  label: 'Present',  color: 'bg-green-50 text-green-700 border-green-100' },
  { value: 'absent',   label: 'Absent',   color: 'bg-red-50 text-red-600 border-red-100' },
  { value: 'late',     label: 'Late',     color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  { value: 'half_day', label: 'Half Day', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { value: 'holiday',  label: 'Holiday',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
];

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type AttendanceStatus = 'present'|'absent'|'late'|'half_day'|'on_leave'|'holiday'|'weekend';

interface DayRecord {
  date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  working_hours: number | null;
  overtime_hours: number | null;
  note?: string | null;
}

interface MonthlyCalendarData {
  year: number;
  month: number;
  summary: {
    present: number; absent: number; late: number;
    half_day: number; on_leave: number;
    overtime_hours: number; working_days: number;
    attendance_percentage: number;
  };
  records: DayRecord[];
}

const STATUS_CFG: Record<AttendanceStatus, {
  label: string; dot: string; bg: string; text: string;
  border: string; calBg: string;
}> = {
  present:  { label:'Present',  dot:'bg-emerald-500', bg:'bg-emerald-50',  text:'text-emerald-700', border:'border-emerald-200', calBg:'bg-emerald-100 hover:bg-emerald-200' },
  late:     { label:'Late',     dot:'bg-amber-500',   bg:'bg-amber-50',    text:'text-amber-700',   border:'border-amber-200',   calBg:'bg-amber-100   hover:bg-amber-200'   },
  absent:   { label:'Absent',   dot:'bg-red-500',     bg:'bg-red-50',      text:'text-red-700',     border:'border-red-200',     calBg:'bg-red-100     hover:bg-red-200'     },
  half_day: { label:'Half Day', dot:'bg-orange-500',  bg:'bg-orange-50',   text:'text-orange-700',  border:'border-orange-200',  calBg:'bg-orange-100  hover:bg-orange-200'  },
  on_leave: { label:'On Leave', dot:'bg-blue-500',    bg:'bg-blue-50',     text:'text-blue-700',    border:'border-blue-200',    calBg:'bg-blue-100    hover:bg-blue-200'    },
  holiday:  { label:'Holiday',  dot:'bg-violet-400',  bg:'bg-violet-50',   text:'text-violet-700',  border:'border-violet-200',  calBg:'bg-violet-100  hover:bg-violet-200'  },
  weekend:  { label:'Weekend',  dot:'bg-slate-300',   bg:'bg-slate-50',    text:'text-slate-400',   border:'border-slate-100',   calBg:'bg-slate-50'                         },
};

function fmt12(t: string | null) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtHrs(h: number | null) {
  if (h == null) return '—';
  const hr = Math.floor(h), mn = Math.round((h - hr) * 60);
  return mn > 0 ? `${hr}h ${mn}m` : `${hr}h`;
}

// ────────────────────────────────────────────────────────────────
// Today's Attendance Card (My Attendance tab for employee)
// ────────────────────────────────────────────────────────────────

function TodayAttendanceCard({ employeeId }: { employeeId?: number }) {
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useWorksheet({
    date: today,
    page: 1,
    per_page: 1,
    employee_id: employeeId,
  });

  const row: WorksheetItem | undefined = data?.data?.[0];

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Clock size={36} className="opacity-20" />
        <p className="text-sm font-medium">No attendance record for today</p>
        <p className="text-xs text-slate-300">{dateLabel}</p>
      </div>
    );
  }

  const statusKey = (row.status as AttendanceStatus) in STATUS_CFG
    ? (row.status as AttendanceStatus)
    : 'absent';
  const cfg = STATUS_CFG[statusKey];

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{dateLabel}</p>
          <p className="text-xs text-slate-400 mt-0.5">Today's attendance record</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Check-in / Check-out cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <LogIn size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Check In</p>
              <p className="text-xl font-bold text-slate-800">{fmt12(row.check_in)}</p>
            </div>
          </div>
          {row.check_in ? (
            <p className="text-xs text-emerald-600 font-medium">✓ Checked in</p>
          ) : (
            <p className="text-xs text-slate-300">Not yet checked in</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <LogOut size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Check Out</p>
              <p className="text-xl font-bold text-slate-800">{fmt12(row.check_out)}</p>
            </div>
          </div>
          {row.check_out ? (
            <p className="text-xs text-blue-600 font-medium">✓ Checked out</p>
          ) : (
            <p className="text-xs text-slate-300">Not yet checked out</p>
          )}
        </div>
      </div>

      {/* Extra info row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={13} className="text-amber-500" />
            <p className="text-xs text-slate-400 font-medium">Overtime</p>
          </div>
          <p className="text-sm font-bold text-slate-700">
            {(row.overtime_hours ?? 0) > 0 ? `${row.overtime_hours}h` : '—'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Check size={13} className="text-slate-400" />
            <p className="text-xs text-slate-400 font-medium">Status</p>
          </div>
          {row.is_saved ? (
            <span className="text-xs font-semibold text-emerald-600">Saved</span>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Pending</span>
          )}
        </div>

        {row.note && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 sm:col-span-1 col-span-2">
            <p className="text-xs text-slate-400 font-medium mb-1">Note</p>
            <p className="text-xs text-slate-600 truncate">{row.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Monthly Report Tab (admin/manager)
// ────────────────────────────────────────────────────────────────

function MonthlyReportTab({ month, year, employeeId, isAdmin }: {
  month: number; year: number; employeeId?: number; isAdmin: boolean;
}) {
  const { data, isLoading } = useMonthlyReport(month, year, employeeId);
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const [tablePage, setTablePage] = useState(1);
  const [overtimePage, setOvertimePage] = useState(1);
  const TABLE_PER_PAGE = 10;
  const OVERTIME_PER_PAGE = 10;

  // Compute aggregate totals across all employees for summary cards
  const rows: any[] = data?.data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      present:  acc.present  + (Number(r.present)  || 0),
      absent:   acc.absent   + (Number(r.absent)   || 0),
      late:     acc.late     + (Number(r.late)      || 0),
      half_day: acc.half_day + (Number(r.half_day) || 0),
      overtime: acc.overtime + (Number(r.overtime_hours) || 0),
    }),
    { present: 0, absent: 0, late: 0, half_day: 0, overtime: 0 }
  );
  const grandTotal = totals.present + totals.absent + totals.late + totals.half_day || 1;

  // Client-side paginated rows for the table only
  const totalTablePages = Math.ceil(rows.length / TABLE_PER_PAGE);
  const pagedRows = rows.slice((tablePage - 1) * TABLE_PER_PAGE, tablePage * TABLE_PER_PAGE);

  // Client-side paginated rows for the sorted overtime summary list
  const sortedOvertimeRows = [...rows].sort((a, b) => Number(b.overtime_hours) - Number(a.overtime_hours));
  const totalOvertimePages = Math.ceil(sortedOvertimeRows.length / OVERTIME_PER_PAGE);
  const pagedOvertimeRows = sortedOvertimeRows.slice((overtimePage - 1) * OVERTIME_PER_PAGE, overtimePage * OVERTIME_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* ── Summary Stats Cards ── */}
      {isAdmin && !isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Present',  value: totals.present,  pct: Math.round(totals.present  / grandTotal * 100), color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: '✓' },
            { label: 'Total Absent',   value: totals.absent,   pct: Math.round(totals.absent   / grandTotal * 100), color: 'red',     bg: 'bg-red-50',     text: 'text-red-600',     bar: 'bg-red-500',     icon: '✗' },
            { label: 'Late Arrivals',  value: totals.late,     pct: Math.round(totals.late     / grandTotal * 100), color: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   icon: '⏰' },
            { label: 'Half Days',      value: totals.half_day, pct: Math.round(totals.half_day / grandTotal * 100), color: 'orange',  bg: 'bg-orange-50',  text: 'text-orange-700',  bar: 'bg-orange-400',  icon: '½' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-${s.color}-100`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <span className={`text-lg font-bold ${s.text}`}>{s.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Rate</span><span>{s.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                  <div className={`h-full ${s.bar} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Overtime Summary ── */}
      {isAdmin && !isLoading && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overtime Hours by Employee</p>
            {totalOvertimePages > 1 && (
              <span className="text-xs text-slate-400 font-medium select-none">
                Page {overtimePage} of {totalOvertimePages} ({rows.length} employees)
              </span>
            )}
          </div>
          <div className="space-y-2">
            {pagedOvertimeRows.map((r: any) => {
              const maxOt = Math.max(...rows.map((x: any) => Number(x.overtime_hours) || 0), 1);
              const pct   = Math.round((Number(r.overtime_hours) || 0) / maxOt * 100);
              return (
                <div key={r.employee_id} className="flex items-center gap-3">
                  <p className="text-xs text-slate-600 w-32 truncate shrink-0">{r.full_name}</p>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right shrink-0">{Number(r.overtime_hours).toFixed(1)}h</span>
                </div>
              );
            })}
          </div>
          {/* Overtime Pagination Controls */}
          {totalOvertimePages > 1 && (
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50 select-none">
              <Button variant="outline" size="sm" disabled={overtimePage === 1}
                onClick={() => setOvertimePage(p => Math.max(p - 1, 1))}
                className="h-8 text-[11px] gap-1 px-2.5">
                <ChevronLeft size={12}/> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={overtimePage === totalOvertimePages}
                onClick={() => setOvertimePage(p => Math.min(p + 1, totalOvertimePages))}
                className="h-8 text-[11px] gap-1 px-2.5">
                Next <ChevronRight size={12}/>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Attendance Distribution Visual ── */}
      {isAdmin && !isLoading && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Attendance Distribution — {monthName} {year}</p>
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
            {[
              { val: totals.present,  cls: 'bg-emerald-500', label: 'Present'  },
              { val: totals.late,     cls: 'bg-amber-400',   label: 'Late'     },
              { val: totals.half_day, cls: 'bg-orange-400',  label: 'Half Day' },
              { val: totals.absent,   cls: 'bg-red-400',     label: 'Absent'   },
            ].filter(s => s.val > 0).map(s => (
              <div
                key={s.label}
                title={`${s.label}: ${s.val}`}
                className={`${s.cls} h-full transition-all duration-700 flex items-center justify-center`}
                style={{ width: `${Math.round(s.val / grandTotal * 100)}%` }}
              >
                {Math.round(s.val / grandTotal * 100) > 8 && (
                  <span className="text-[10px] font-semibold text-white">{Math.round(s.val / grandTotal * 100)}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {[
              { val: totals.present,  cls: 'bg-emerald-500', label: 'Present'  },
              { val: totals.late,     cls: 'bg-amber-400',   label: 'Late'     },
              { val: totals.half_day, cls: 'bg-orange-400',  label: 'Half Day' },
              { val: totals.absent,   cls: 'bg-red-400',     label: 'Absent'   },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${s.cls}`} />
                {s.label} ({s.val})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail Table with Client-Side Pagination ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Monthly Report — {monthName} {year}</h3>
          {!isLoading && rows.length > 0 && (
            <span className="text-xs text-slate-400">{rows.length} employees</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {isAdmin && (
                <>
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Employee</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Department</th>
                </>
              )}
              <th className="text-center px-4 py-3 font-medium text-green-600">Present</th>
              <th className="text-center px-4 py-3 font-medium text-red-500">Absent</th>
              <th className="text-center px-4 py-3 font-medium text-yellow-600">Late</th>
              <th className="text-center px-4 py-3 font-medium text-orange-600">Half Day</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">OT Hrs</th>
              {isAdmin && <th className="text-center px-4 py-3 font-medium text-slate-400">Attendance %</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={isAdmin ? 8 : 5} className="text-center py-10">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={isAdmin ? 8 : 5} className="text-center py-10 text-slate-400 text-sm">
                No attendance data found for {monthName} {year}
              </td></tr>
            ) : (
              pagedRows.map((row: any) => {
                const total = (Number(row.present) || 0) + (Number(row.absent) || 0) + (Number(row.late) || 0) + (Number(row.half_day) || 0) || 1;
                const pct   = Math.round(((Number(row.present) || 0) + (Number(row.late) || 0) * 0.5) / total * 100);
                return (
                  <tr key={row.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    {isAdmin && (
                      <>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-700">{row.full_name}</p>
                          <p className="text-xs text-slate-400">{row.employee_code}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{row.department ?? '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-semibold">{row.present}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-red-500 font-semibold">{row.absent}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-yellow-600 font-semibold">{row.late}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-orange-600 font-semibold">{row.half_day}</span></td>
                    <td className="px-4 py-3 text-center text-slate-500">{Number(row.overtime_hours).toFixed(1)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-9 text-right ${
                            pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-500'
                          }`}>{pct}%</span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Table Pagination ── */}
        {!isLoading && totalTablePages > 1 && (
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between select-none">
            <span className="text-xs text-slate-500 font-medium">
              Page {tablePage} of {totalTablePages} ({rows.length} employees)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={tablePage === 1}
                onClick={() => setTablePage(p => Math.max(p - 1, 1))}
                className="h-8 text-xs gap-1">
                <ChevronLeft size={14}/> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={tablePage === totalTablePages}
                onClick={() => setTablePage(p => Math.min(p + 1, totalTablePages))}
                className="h-8 text-xs gap-1">
                Next <ChevronRight size={14}/>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Employee Calendar Components
// ────────────────────────────────────────────────────────────────

function SummaryBar({ s }: { s: MonthlyCalendarData['summary'] }) {
  const items = [
    { label:'Present',  value:s.present,                   icon:CheckCircle2, cls:'text-emerald-600 bg-emerald-50' },
    { label:'Absent',   value:s.absent,                    icon:XCircle,      cls:'text-red-500     bg-red-50'     },
    { label:'Late',     value:s.late,                      icon:AlertCircle,  cls:'text-amber-500   bg-amber-50'   },
    { label:'Half Day', value:s.half_day,                  icon:Minus,        cls:'text-orange-500  bg-orange-50'  },
    { label:'On Leave', value:s.on_leave,                  icon:CalendarDays, cls:'text-blue-500    bg-blue-50'    },
    { label:'OT Hours', value:fmtHrs(s.overtime_hours),    icon:Timer,        cls:'text-violet-600  bg-violet-50'  },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(({ label, value, icon: Icon, cls }) => (
        <div key={label} className={`${cls.split(' ')[1]} rounded-xl px-3 py-3 flex flex-col items-center gap-1`}>
          <Icon size={15} className={cls.split(' ')[0]} />
          <p className={`text-xl font-bold ${cls.split(' ')[0]}`}>{value}</p>
          <p className="text-[11px] text-slate-500 font-medium text-center leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}

function CalendarGrid({ year, month, records, selected, onSelect }: {
  year: number; month: number; records: DayRecord[];
  selected: DayRecord | null; onSelect: (r: DayRecord | null) => void;
}) {
  const map = Object.fromEntries(records.map(r => [r.date, r]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
      return map[d] ?? { date: d, status: 'weekend' as AttendanceStatus, check_in:null, check_out:null, working_hours:null, overtime_hours:null };
    }),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-2 tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />;
          const cfg = STATUS_CFG[cell.status as AttendanceStatus];
          const isSel = selected?.date === cell.date;
          const isToday = cell.date === today;
          const isWeekend = cell.status === 'weekend';
          const dayNum = parseInt(cell.date.slice(8));

          return (
            <button
              key={cell.date}
              onClick={() => !isWeekend && onSelect(isSel ? null : cell)}
              disabled={isWeekend}
              className={`
                relative flex flex-col items-center justify-start pt-1.5 pb-1
                rounded-xl min-h-[52px] text-xs font-medium transition-all
                ${isWeekend ? 'opacity-35 cursor-default' : 'cursor-pointer'}
                ${isSel ? `${cfg.bg} ring-2 ring-offset-1 ${cfg.border.replace('border-','ring-')} shadow-md` : cfg.calBg}
                ${isToday ? 'ring-2 ring-slate-800 ring-offset-1' : ''}
              `}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full mb-0.5 text-[11px] font-bold
                ${isToday ? 'bg-slate-800 text-white' : cfg.text}`}>
                {dayNum}
              </span>
              {!isWeekend && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-slate-100">
        {(['present','late','absent','half_day','on_leave','holiday'] as AttendanceStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
            <span className="text-xs text-slate-500">{STATUS_CFG[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayDetailPanel({ record }: { record: DayRecord }) {
  const cfg = STATUS_CFG[record.status];
  const label = new Date(record.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 space-y-4 h-fit`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <span className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        {record.working_hours != null && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-slate-800">{fmtHrs(record.working_hours)}</p>
            <p className="text-xs text-slate-400">worked</p>
          </div>
        )}
      </div>

      {(record.check_in || record.check_out) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 border border-white/80 shadow-sm">
            <p className="text-xs text-slate-400 mb-0.5">Check In</p>
            <p className="text-sm font-bold text-slate-800">{fmt12(record.check_in)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-white/80 shadow-sm">
            <p className="text-xs text-slate-400 mb-0.5">Check Out</p>
            <p className="text-sm font-bold text-slate-800">{fmt12(record.check_out)}</p>
          </div>
        </div>
      )}

      {(record.overtime_hours ?? 0) > 0 && (
        <div className="bg-white rounded-xl p-3 border border-white/80 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-amber-500" />
            <span className="text-xs text-slate-600 font-medium">Overtime</span>
          </div>
          <span className="text-sm font-bold text-amber-600">{fmtHrs(record.overtime_hours)}</span>
        </div>
      )}

      {record.note && (
        <p className="text-xs text-slate-500 bg-white/70 rounded-lg px-3 py-2 border border-white/80">{record.note}</p>
      )}
    </div>
  );
}

function ListRows({ records }: { records: DayRecord[] }) {
  const working = records
    .filter(r => r.status !== 'weekend' && r.status !== 'holiday')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!working.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
      <CalendarDays size={28} className="opacity-30" />
      <p className="text-sm">No records this month</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        <span>Date</span><span>Status</span><span>Check In</span><span>Check Out</span><span>Hours</span><span>OT</span>
      </div>
      {working.map(r => {
        const cfg = STATUS_CFG[r.status];
        const dt = new Date(r.date + 'T00:00:00');
        return (
          <div key={r.date} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center
            bg-white rounded-xl border border-slate-100 px-4 py-3 text-sm
            hover:border-slate-200 hover:shadow-sm transition-all">
            <div>
              <p className="font-semibold text-slate-700">
                {dt.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
              </p>
              <p className="text-xs text-slate-400">{dt.getFullYear()}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} w-fit`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
            <span className="text-slate-600 text-xs">{fmt12(r.check_in)}</span>
            <span className="text-slate-600 text-xs">{fmt12(r.check_out)}</span>
            <span className="text-slate-700 font-medium text-xs">{fmtHrs(r.working_hours)}</span>
            <span className={`text-xs font-medium ${(r.overtime_hours??0)>0 ? 'text-amber-600' : 'text-slate-300'}`}>
              {(r.overtime_hours??0)>0 ? fmtHrs(r.overtime_hours) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Employee Calendar View (Monthly Report tab)
// ────────────────────────────────────────────────────────────────

function EmployeeCalendarView({ scopedEmployeeId }: { scopedEmployeeId?: number }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView]   = useState<'calendar'|'list'>('calendar');
  const [calData, setCalData]       = useState<MonthlyCalendarData | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [selected, setSelected]     = useState<DayRecord | null>(null);

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    setSelected(null);
    try {
      const res = await api.get(`/attendance/my-calendar?year=${year}&month=${month}`);
      setCalData(res.data);
    } catch (e) {
      console.error('Calendar load error:', e);
    } finally {
      setCalLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const isNextDisabled = year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const prevMonth = () => { if (month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[130px] text-center">
            {MONTHS[month-1]} {year}
          </span>
          <button onClick={nextMonth} disabled={isNextDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {(['calendar','list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view===v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {v==='calendar' ? <><CalendarDays size={13}/> Calendar</> : <><List size={13}/> List</>}
            </button>
          ))}
        </div>
      </div>

      {calLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 w-7 h-7" />
        </div>
      ) : !calData ? (
        <div className="flex flex-col h-48 items-center justify-center gap-2 text-slate-400">
          <XCircle size={26} /><p className="text-sm">Could not load data. Please refresh.</p>
        </div>
      ) : (
        <>
          <SummaryBar s={calData.summary} />

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Attendance Rate</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{calData.summary.attendance_percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-700 ${
                calData.summary.attendance_percentage >= 90 ? 'bg-emerald-500' :
                calData.summary.attendance_percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width:`${Math.min(calData.summary.attendance_percentage,100)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {calData.summary.present} present out of {calData.summary.working_days} working days
            </p>
          </div>

          {view === 'calendar' ? (
            <div className={`grid gap-5 ${selected ? 'md:grid-cols-[1fr_300px]' : ''}`}>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <CalendarGrid year={year} month={month} records={calData.records}
                  selected={selected} onSelect={setSelected} />
              </div>
              {selected && <DayDetailPanel record={selected} />}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-4">
              <ListRows records={calData.records} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Team Calendar Tab Component (Manager / Team Lead / Admin / HR)
// ────────────────────────────────────────────────────────────────

interface TeamLeave {
  leave_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  employee_name: string;
  department: string;
  leave_type: string;
}

function TeamCalendarTab({
  isAdmin,
  filterDept,
  departments,
}: {
  isAdmin: boolean;
  filterDept: string;
  departments: any[];
}) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView]   = useState<'calendar' | 'list'>('calendar');
  const [leaves, setLeaves] = useState<TeamLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/attendance/month-leaves`, {
        params: { year, month },
      });
      setLeaves(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load team leaves:', err);
      toast.error('Failed to load team leaves');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const selectedDeptName = useMemo(() => {
    if (!filterDept) return '';
    return departments.find((d: any) => d.id === Number(filterDept))?.name || '';
  }, [filterDept, departments]);

  const filteredLeaves = useMemo(() => {
    if (!selectedDeptName) return leaves;
    return leaves.filter((l) => l.department === selectedDeptName);
  }, [leaves, selectedDeptName]);

  const leavesByDate = useMemo(() => {
    const map: Record<string, TeamLeave[]> = {};
    filteredLeaves.forEach((leave) => {
      const start = new Date(leave.start_date + 'T00:00:00');
      const end = new Date(leave.end_date + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        if (!map[dateStr].find((item) => item.leave_id === leave.leave_id)) {
          map[dateStr].push(leave);
        }
      }
    });
    return map;
  }, [filteredLeaves]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return {
        date: dateStr,
        dayNum,
        leaves: leavesByDate[dateStr] || [],
      };
    }),
  ];

  const activeLeavesCount = filteredLeaves.length;

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-1 py-1 shadow-sm bg-slate-50/50">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[130px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {activeLeavesCount} Approved Leave{activeLeavesCount !== 1 ? 's' : ''} This Month
          </span>

          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {(['calendar', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === v
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v === 'calendar' ? (
                  <>
                    <CalendarDays size={13} /> Calendar
                  </>
                ) : (
                  <>
                    <List size={13} /> List
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 w-7 h-7" />
        </div>
      ) : view === 'calendar' ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-2">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-semibold text-slate-400 py-1 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} className="bg-slate-50/20 rounded-xl" />;

                const isSel = selectedDate === cell.date;
                const isToday = cell.date === today;
                const isSun = i % 7 === 0;
                const isSat = i % 7 === 6;
                const isWeekend = isSun || isSat;

                return (
                  <button
                    key={cell.date}
                    onClick={() => setSelectedDate(isSel ? null : cell.date)}
                    className={`
                      relative flex flex-col justify-between p-2.5
                      rounded-xl min-h-[76px] transition-all duration-200 text-left border group
                      ${isWeekend ? 'bg-slate-50/40 border-slate-100/50' : 'bg-slate-50/10 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'}
                      ${isSel ? 'ring-2 ring-blue-600 border-transparent bg-blue-50/20 shadow-sm scale-[1.02]' : ''}
                      ${isToday ? 'border-2 border-slate-800' : ''}
                    `}
                  >
                    {/* Day Number */}
                    <span
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                        ${isToday ? 'bg-slate-800 text-white shadow-sm' : isWeekend ? 'text-slate-400' : 'text-slate-600'}
                        group-hover:scale-105 transition-transform
                      `}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Leave Pills */}
                    {(() => {
                      if (cell.leaves.length === 0) return null;
                      const compOffs = cell.leaves.filter((l: any) =>
                        l.leave_type?.toLowerCase().includes('compensatory') ||
                        l.leave_type?.toLowerCase().includes('comp')
                      );
                      const regularLeaves = cell.leaves.filter((l: any) =>
                        !l.leave_type?.toLowerCase().includes('compensatory') &&
                        !l.leave_type?.toLowerCase().includes('comp')
                      );
                      return (
                        <div className="mt-2 w-full space-y-1">
                          {compOffs.length > 0 && (
                            <div className="w-full px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700 truncate shadow-sm flex items-center gap-1 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>
                                {compOffs.length === 1
                                  ? `${compOffs[0].employee_name} (Comp)`
                                  : `${compOffs.length} Comp Offs`}
                              </span>
                            </div>
                          )}
                          {regularLeaves.length > 0 && (
                            <div className="w-full px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 truncate shadow-sm flex items-center gap-1 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>
                                {regularLeaves.length === 1
                                  ? regularLeaves[0].employee_name
                                  : `${regularLeaves.length} On Leave`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-slate-100 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span className="text-[11px] font-semibold text-slate-500">Regular Approved Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-[11px] font-semibold text-slate-500">Compensatory Off (Comp Off)</span>
              </div>
            </div>
          </div>

          {/* Details Side-Panel */}
          {selectedDate ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in slide-in-from-right duration-250 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Leave Details</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <XCircle size={16} />
                </button>
              </div>

              {(() => {
                const dayLeaves = leavesByDate[selectedDate] || [];
                if (dayLeaves.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                      <Plane size={24} className="opacity-20 animate-pulse" />
                      <p className="text-xs font-semibold text-slate-400">No one is on leave today</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {dayLeaves.map((leave) => {
                      const isComp = leave.leave_type?.toLowerCase().includes('compensatory') || leave.leave_type?.toLowerCase().includes('comp');
                      return (
                        <div
                          key={leave.leave_id}
                          className={`p-3 bg-gradient-to-br rounded-xl border shadow-sm flex items-start gap-3 hover:shadow hover:scale-[1.01] transition-all group duration-200 ${
                            isComp ? 'from-amber-50 to-orange-50/20 border-amber-100/50' : 'from-blue-50 to-indigo-50/20 border-blue-100/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none transition-colors ${
                            isComp ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white' : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                          }`}>
                            {leave.employee_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{leave.employee_name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                isComp ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 'bg-blue-50 text-blue-600 border-blue-100/50'
                              }`}>
                                {leave.leave_type}
                              </span>
                              {isAdmin && (
                                <span className="text-[9px] font-semibold text-slate-400">
                                  {leave.department}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-2 font-mono">
                              {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              -{' '}
                              {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 border-dashed bg-slate-50/30 p-8 text-center text-slate-400 h-full flex flex-col justify-center items-center gap-2">
              <CalendarDays className="w-8 h-8 opacity-20" />
              <p className="text-xs font-bold text-slate-500">Select a date on the calendar</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed mx-auto">
                Click any highlighted date cell to view the full roster of team members on leave.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Chronological Leave Register</h3>
            <span className="text-xs text-slate-400 font-semibold">{filteredLeaves.length} items</span>
          </div>

          {filteredLeaves.length === 0 ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
              <Plane className="w-10 h-10 opacity-10 animate-bounce" />
              <p className="text-sm font-semibold">No approved leaves this month</p>
              <p className="text-xs text-slate-300">Roster remains fully active without scheduled breaks.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredLeaves.map((leave) => {
                const isComp = leave.leave_type?.toLowerCase().includes('compensatory') || leave.leave_type?.toLowerCase().includes('comp');
                return (
                  <div
                    key={leave.leave_id}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-2 rounded-xl transition-all text-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                        isComp ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        {leave.employee_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{leave.employee_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {leave.department} • {leave.leave_type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono font-bold bg-slate-50 border border-slate-100 rounded px-2.5 py-1">
                    {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const today    = new Date().toISOString().split('T')[0];
  const nowMonth = new Date().getMonth() + 1;
  const nowYear  = new Date().getFullYear();

  const [empTab, setEmpTab] = useState<'today'|'monthly'>('today');
  const [tab, setTab]               = useState<'daily'|'monthly'|'calendar'>('daily');
  const [selectedDate, setDate]     = useState(today);
  const [page, setPage]             = useState(1);
  const [month, setMonth]           = useState(nowMonth);
  const [year, setYear]             = useState(nowYear);
  const [filterDept, setFilterDept] = useState('');

  const [globalIn, setGlobalIn]         = useState('09:00');
  const [globalOut, setGlobalOut]       = useState('18:00');
  const [globalStatus, setGlobalStatus] = useState('present');
  const [worksheetData, setWorksheetData] = useState<WorksheetItem[]>([]);
  const [mounted, setMounted]           = useState(false);
  const [selectAllGlobally, setSelectAllGlobally] = useState(false);
  const [globalAppliedValues, setGlobalAppliedValues] = useState<{
    check_in: string;
    check_out: string;
    status: string;
    overtime_hours: number;
  } | null>(null);

  const { hasPermission, user } = useAuthStore();
  const tier = resolveRoleTier(user);
  console.log('ROLE DEBUG', {
  tier,
  employee_id: user?.employee_id,
  permissions: user?.permissions
});

  const isSuperAdminOrHR = mounted && (
  hasPermission('view all attendance') ||
  tier === 'super_admin' ||
  tier === 'admin' ||
  tier === 'hr'
);

  const isTeamLeadOrManager = mounted && !isSuperAdminOrHR && (
    tier === 'team_lead' ||
    tier === 'manager' ||
    tier === 'sales_manager'
  );

  const isAdmin = isSuperAdminOrHR || isTeamLeadOrManager;
  const isEmployee = mounted && !isAdmin;

  // Only SuperAdmin or HR can save/edit attendance records
  const canManage = isSuperAdminOrHR;

  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  // Set the default viewMode based on user tier on mount
  useEffect(() => {
    if (mounted) {
      if (isSuperAdminOrHR) {
        setViewMode('team');
      } else if (isTeamLeadOrManager) {
        setViewMode('team');
      } else {
        setViewMode('personal');
      }
    }
  }, [mounted, isSuperAdminOrHR, isTeamLeadOrManager]);

  const { data: departmentsResponse }               = useDepartments();
  const { mutate: saveBulk, isPending: isSavingBulk } = useSaveBulkAttendance();

  useEffect(() => setMounted(true), []);

  const departments      = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];
  const scopedEmployeeId = (isAdmin && viewMode === 'team') ? undefined : (user?.employee_id ?? (user as any)?.employee?.id ?? undefined);

  const { data: backendWorksheet, isLoading: isWorksheetLoading } = useWorksheet({
    date:        selectedDate,
    page,
    per_page:    10,
    employee_id: scopedEmployeeId,
    enabled:     isAdmin && viewMode === 'team' && tab === 'daily',
  } as any);

  useEffect(() => {
    if (backendWorksheet?.data) {
      setWorksheetData(backendWorksheet.data.map((item: WorksheetItem) => ({ ...item, selected: false })));
    }
  }, [backendWorksheet]);

  const handleRowChange = (index: number, key: keyof WorksheetItem, value: any) =>
    setWorksheetData(prev => prev.map((row, idx) => idx === index ? { ...row, [key]: value } : row));

  const handleRowSelectToggle = (index: number) => {
    if (selectAllGlobally) {
      setSelectAllGlobally(false);
      setWorksheetData(prev => prev.map((r, idx) => {
        const isOnLeave = r.note?.includes('On Approved Leave');
        if (isOnLeave) return r;
        return { ...r, selected: idx !== index };
      }));
    } else {
      handleRowChange(index, 'selected', !worksheetData[index].selected);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectAllGlobally(false);
      setWorksheetData(prev => prev.map(row => ({ ...row, selected: false })));
    } else {
      setWorksheetData(prev => prev.map(row =>
        row.note?.includes('On Approved Leave') ? row : { ...row, selected: true }));
    }
  };

  const activeRows    = worksheetData.filter(r => !r.note?.includes('On Approved Leave'));
  const isAllSelected = activeRows.length > 0 && activeRows.every(r => r.selected);
  const selectedCount = worksheetData.filter(r => r.selected).length;

  const applyGlobalTimeModifications = () => {
    if (selectAllGlobally) {
      setGlobalAppliedValues({
        check_in:       globalStatus === 'absent' ? '' : globalIn,
        check_out:      globalStatus === 'absent' ? '' : globalOut,
        overtime_hours: 0,
        status:         globalStatus,
      });
    }
    setWorksheetData(prev => prev.map(row => {
      if ((!selectAllGlobally && !row.selected) || row.note?.includes('On Approved Leave')) return row;
      return {
        ...row,
        check_in:       globalStatus === 'absent' ? '' : globalIn,
        check_out:      globalStatus === 'absent' ? '' : globalOut,
        overtime_hours: globalStatus === 'absent' ? 0 : row.overtime_hours,
        status:         globalStatus as any,
      };
    }));
  };

  const [isSavingAllGlobally, setIsSavingAllGlobally] = useState(false);

  const handleBulkSavePayload = async () => {
    if (selectAllGlobally) {
      try {
        setIsSavingAllGlobally(true);
        const response = await api.get('/attendance/worksheet', {
          params: {
            date:        selectedDate,
            page:        1,
            per_page:    1000,
            ...(scopedEmployeeId ? { employee_id: scopedEmployeeId } : {}),
          }
        });
        const allItems = response.data?.data || [];
        const targetStatus = globalAppliedValues?.status || globalStatus;
        const targetIn     = globalAppliedValues?.check_in || globalIn;
        const targetOut    = globalAppliedValues?.check_out || globalOut;

        const records = allItems.map((item: WorksheetItem) => {
          const isOnLeave = item.note?.includes('On Approved Leave');
          if (isOnLeave) {
            return {
              employee_id: item.employee_id,
              check_in:    item.check_in,
              check_out:   item.check_out,
              status:      item.status,
              overtime_hours: item.overtime_hours,
              note:        item.note,
            };
          }
          return {
            employee_id:    item.employee_id,
            check_in:       targetStatus === 'absent' ? '' : targetIn,
            check_out:      targetStatus === 'absent' ? '' : targetOut,
            status:         targetStatus,
            overtime_hours: targetStatus === 'absent' ? 0 : item.overtime_hours,
            note:           item.note,
          };
        });

        saveBulk({ date: selectedDate, records }, {
          onSuccess: () => {
            setSelectAllGlobally(false);
            setGlobalAppliedValues(null);
            setIsSavingAllGlobally(false);
          },
          onError: () => {
            setIsSavingAllGlobally(false);
          }
        });
      } catch (err: any) {
        toast.error('Failed to fetch full sheet data for global save');
        setIsSavingAllGlobally(false);
      }
    } else {
      saveBulk({ date: selectedDate, records: worksheetData.map(
        ({ employee_id, check_in, check_out, status, overtime_hours, note }) => ({
          employee_id,
          check_in:       status === 'absent' ? '' : check_in,
          check_out:      status === 'absent' ? '' : check_out,
          status, overtime_hours: status === 'absent' ? 0 : overtime_hours, note,
        })
      )});
    }
  };

  const prevAdminMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextAdminMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const filteredWorksheet = worksheetData.filter(
    row => !filterDept || row.department === departments.find((d: any) => d.id === Number(filterDept))?.name
  );
  const colSpan = canManage ? (isAdmin ? 8 : 6) : (isAdmin ? 7 : 5);

  // ── Employee or Personal view ─────────────────────────────────
  if (isEmployee || viewMode === 'personal') {
    return (
      <div className="space-y-5">
        {/* Toggle Mode for Management/Admin Users */}
        {isTeamLeadOrManager && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
            <button
              onClick={() => setViewMode('personal')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                (viewMode as string) === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                (viewMode as string) === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Team Attendance
            </button>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Attendance</h2>
          <p className="text-sm text-slate-400">Your personal daily and monthly attendance records</p>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setEmpTab('today')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              empTab === 'today' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock size={14}/> My Attendance
          </button>
          <button
            onClick={() => setEmpTab('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              empTab === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <BarChart3 size={14}/> Monthly Report
          </button>
        </div>

        {empTab === 'today' && (
          <TodayAttendanceCard employeeId={scopedEmployeeId} />
        )}

        {empTab === 'monthly' && (
          <EmployeeCalendarView scopedEmployeeId={scopedEmployeeId} />
        )}
      </div>
    );
  }

  // ── Admin / HR / Manager / Team Lead: team/worksheet view ─────
  return (
    <div className="space-y-5">
      {/* Toggle Mode for Management/Admin Users */}
      {isTeamLeadOrManager && (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
          <button
            onClick={() => setViewMode('personal')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              (viewMode as string) === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Attendance
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              (viewMode as string) === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Team Attendance
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {isSuperAdminOrHR ? 'Organization Attendance' : `${user?.employee?.department ? `${user.employee.department} Department` : 'Team'} Attendance`}
          </h2>
          <p className="text-sm text-slate-400">
            {isSuperAdminOrHR 
              ? 'Direct tabular row-management sheet layout for all departments' 
              : `Review attendance and leave calendar for members reporting in your department`}
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('daily')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab==='daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Daily View
        </button>
        <button onClick={() => setTab('monthly')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab==='monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <BarChart3 size={14}/> Monthly Report
        </button>
        <button onClick={() => setTab('calendar')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab==='calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <CalendarDays size={14}/> Team Calendar
        </button>
      </div>

      {tab === 'daily' && (
        <>
          <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <Input type="date" value={selectedDate}
                onChange={e => { setDate(e.target.value); setPage(1); }}
                className="h-10 w-44" />
              {isSuperAdminOrHR && (
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none bg-transparent">
                  <option value="">All Departments</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>

            {canManage && (selectedCount > 0 || selectAllGlobally) && (
              <div className="flex items-center gap-2 bg-blue-50/60 p-1.5 rounded-lg border border-blue-100 text-xs text-blue-800 animate-in fade-in duration-200">
                <span className="font-medium pl-1">
                  {selectAllGlobally ? backendWorksheet?.total : selectedCount} Selected:
                </span>
                <Input type="time" disabled={globalStatus==='absent'} value={globalStatus==='absent'?'':globalIn}
                  onChange={e => setGlobalIn(e.target.value)} className="h-7 w-24 px-1 bg-white" />
                <Input type="time" disabled={globalStatus==='absent'} value={globalStatus==='absent'?'':globalOut}
                  onChange={e => setGlobalOut(e.target.value)} className="h-7 w-24 px-1 bg-white" />
                <select value={globalStatus} onChange={e => setGlobalStatus(e.target.value)}
                  className="border border-slate-200 rounded px-1.5 h-7 text-xs bg-white">
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <Button size="sm" type="button" onClick={applyGlobalTimeModifications}
                  className="bg-blue-600 hover:bg-blue-500 h-7 text-white text-xs px-2.5">
                  Apply All
                </Button>
              </div>
            )}

            {canManage && (
              <Button onClick={handleBulkSavePayload} disabled={isSavingBulk || isSavingAllGlobally}
                className="bg-green-600 hover:bg-green-500 text-white gap-2 ml-auto h-10 shadow-sm">
                {(isSavingBulk || isSavingAllGlobally) ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save size={16}/>}
                Save Entire Sheet
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {canManage && isAllSelected && backendWorksheet && backendWorksheet.total > worksheetData.length && !selectAllGlobally && (
              <div className="bg-blue-50/50 border-b border-blue-100 px-5 py-2.5 text-xs text-blue-700 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>Selected all <strong>{worksheetData.filter(r => r.selected).length}</strong> employees on this page.</span>
                </div>
                <button type="button" onClick={() => setSelectAllGlobally(true)} className="underline hover:text-blue-900 font-semibold transition-colors">
                  Select all {backendWorksheet.total} employees in this worksheet
                </button>
              </div>
            )}
            {canManage && selectAllGlobally && backendWorksheet && (
              <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 text-xs text-blue-700 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>All <strong>{backendWorksheet.total}</strong> employees in this worksheet are selected.</span>
                </div>
                <button type="button" onClick={() => { setSelectAllGlobally(false); toggleSelectAll(false); }} className="underline hover:text-blue-900 font-semibold transition-colors">
                  Clear selection
                </button>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 select-none">
                  {canManage && (
                    <th className="px-5 py-3.5 w-12 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectAllGlobally) {
                            // Already global — clear everything
                            setSelectAllGlobally(false);
                            toggleSelectAll(false);
                          } else if (isAllSelected && backendWorksheet && backendWorksheet.total > worksheetData.length) {
                            // All on this page already selected, escalate to global
                            setSelectAllGlobally(true);
                          } else if (isAllSelected) {
                            // Only 1 page total — clear
                            toggleSelectAll(false);
                          } else {
                            // Select all on current page
                            toggleSelectAll(true);
                          }
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {(isAllSelected || selectAllGlobally) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                      </button>
                    </th>
                  )}
                  {isAdmin && (
                    <>
                      <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
                      <th className="text-left px-5 py-3.5 font-medium text-slate-500">Department</th>
                    </>
                  )}
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500 w-36">Check In</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500 w-36">Check Out</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500 w-32">OT Hours</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500 w-40">Status</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isWorksheetLoading ? (
                  <tr><td colSpan={colSpan} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/>
                  </td></tr>
                ) : filteredWorksheet.length === 0 ? (
                  <tr><td colSpan={colSpan} className="text-center py-12">
                    <Clock className="w-10 h-10 mx-auto text-slate-200 mb-2"/>
                    <p className="text-slate-400 text-sm">No attendance record found</p>
                  </td></tr>
                ) : (
                  filteredWorksheet.map((row, index) => {
                    const isOnLeave = row.note?.includes('On Approved Leave');
                    const isRowChecked = selectAllGlobally ? !isOnLeave : row.selected;
                    return (
                      <tr key={row.employee_id} className={`transition-colors ${
                        isOnLeave ? 'bg-slate-50/40 text-slate-400 select-none' :
                        isRowChecked ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                        {canManage && (
                          <td className="px-5 py-3.5">
                            <button type="button" disabled={isOnLeave}
                              onClick={() => handleRowSelectToggle(index)}
                              className={`text-slate-400 transition-colors ${isOnLeave?'opacity-20 cursor-not-allowed':'hover:text-slate-600'}`}>
                              {isRowChecked ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                            </button>
                          </td>
                        )}
                        {isAdmin && (
                          <>
                            <td className="px-5 py-3.5">
                              <p className={`font-medium ${isOnLeave?'text-slate-400 line-through':'text-slate-700'}`}>{row.name}</p>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-sm">{row.department}</td>
                          </>
                        )}
                        <td className="px-5 py-3.5">
                          {canManage ? (
                            <Input type="time" disabled={row.status==='absent'||isOnLeave}
                              value={row.status==='absent'?'':row.check_in}
                              onChange={e => handleRowChange(index,'check_in',e.target.value)}
                              className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"/>
                          ) : (
                            <span className="font-mono text-xs font-medium text-slate-600">{fmt12(row.check_in)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {canManage ? (
                            <Input type="time" disabled={row.status==='absent'||isOnLeave}
                              value={row.status==='absent'?'':row.check_out}
                              onChange={e => handleRowChange(index,'check_out',e.target.value)}
                              className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"/>
                          ) : (
                            <span className="font-mono text-xs font-medium text-slate-600">{fmt12(row.check_out)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {canManage ? (
                            <Input type="number" disabled={row.status==='absent'||isOnLeave}
                              step="0.5" min="0" max="12"
                              value={row.status==='absent'?0:row.overtime_hours}
                              onChange={e => handleRowChange(index,'overtime_hours',Number(e.target.value))}
                              className="h-9 text-xs bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"/>
                          ) : (
                            <span className="text-xs font-medium text-slate-500">
                              {(row.overtime_hours ?? 0) > 0 ? `${row.overtime_hours}h` : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {canManage && !isOnLeave ? (
                            <select value={row.status}
                              onChange={e => {
                                const s = e.target.value;
                                handleRowChange(index,'status',s);
                                if (s==='absent') {
                                  handleRowChange(index,'check_in','');
                                  handleRowChange(index,'check_out','');
                                  handleRowChange(index,'overtime_hours',0);
                                }
                              }}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs h-9 focus:outline-none bg-transparent font-medium disabled:opacity-50">
                              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            (() => {
                              const sKey = (row.status as AttendanceStatus) in STATUS_CFG
                                ? (row.status as AttendanceStatus)
                                : isOnLeave ? 'on_leave' : 'absent';
                              const cfg = STATUS_CFG[sKey];
                              return (
                                <Badge className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border} shadow-none`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </Badge>
                              );
                            })()
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isOnLeave ? (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 shadow-none font-normal gap-1 rounded-md animate-pulse">
                              <Plane size={12}/> On Approved Leave
                            </Badge>
                          ) : row.is_saved ? (
                            <Badge className="bg-green-50 text-green-700 border border-green-200 shadow-none font-normal gap-1 rounded-md">
                              <Check size={12}/> Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal rounded-md">Unsaved</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {backendWorksheet && backendWorksheet.last_page > 1 && (
              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between select-none">
                <span className="text-xs text-slate-500 font-medium">
                  Page {backendWorksheet.current_page} of {backendWorksheet.last_page} ({backendWorksheet.total} records)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page===1}
                    onClick={() => setPage(p => Math.max(p-1,1))} className="h-8 text-xs gap-1">
                    <ChevronLeft size={14}/> Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={page===backendWorksheet.last_page}
                    onClick={() => setPage(p => Math.min(p+1,backendWorksheet.last_page))} className="h-8 text-xs gap-1">
                    Next <ChevronRight size={14}/>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'monthly' && (
        <>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-fit">
            <button onClick={prevAdminMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">
              <ChevronLeft size={16}/>
            </button>
            <span className="text-sm font-semibold text-slate-700 w-36 text-center">
              {new Date(year,month-1).toLocaleString('default',{month:'long'})} {year}
            </span>
            <button onClick={nextAdminMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">
              <ChevronRight size={16}/>
            </button>
          </div>
          <MonthlyReportTab month={month} year={year} employeeId={scopedEmployeeId} isAdmin={isAdmin}/>
        </>
      )}

      {tab === 'calendar' && (
        <TeamCalendarTab isAdmin={isSuperAdminOrHR} filterDept={filterDept} departments={departments} />
      )}
    </div>
  );
}