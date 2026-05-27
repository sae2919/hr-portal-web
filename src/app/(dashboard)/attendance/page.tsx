'use client';

import { useState, useEffect, useCallback } from 'react';
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

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Monthly Report — {monthName} {year}</h3>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {isLoading ? (
            <tr><td colSpan={isAdmin ? 7 : 5} className="text-center py-10">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
            </td></tr>
          ) : (
            data?.data.map((row: any) => (
              <tr key={row.employee_id} className="hover:bg-slate-50">
                {isAdmin && (
                  <>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-700">{row.full_name}</p>
                      <p className="text-xs text-slate-400">{row.employee_code}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{row.department ?? '—'}</td>
                  </>
                )}
                <td className="px-4 py-3 text-center"><span className="text-green-600 font-semibold">{row.present}</span></td>
                <td className="px-4 py-3 text-center"><span className="text-red-500 font-semibold">{row.absent}</span></td>
                <td className="px-4 py-3 text-center"><span className="text-yellow-600 font-semibold">{row.late}</span></td>
                <td className="px-4 py-3 text-center"><span className="text-orange-600 font-semibold">{row.half_day}</span></td>
                <td className="px-4 py-3 text-center text-slate-500">{Number(row.overtime_hours).toFixed(1)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
          const cfg = STATUS_CFG[cell.status];
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
      const res = await api.get(`/v1/attendance/my-calendar?year=${year}&month=${month}`);
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
// Main Page
// ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const today    = new Date().toISOString().split('T')[0];
  const nowMonth = new Date().getMonth() + 1;
  const nowYear  = new Date().getFullYear();

  const [empTab, setEmpTab] = useState<'today'|'monthly'>('today');
  const [tab, setTab]               = useState<'daily'|'monthly'>('daily');
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

  const { hasPermission, user } = useAuthStore();
  const { data: departmentsResponse }               = useDepartments();
  const { mutate: saveBulk, isPending: isSavingBulk } = useSaveBulkAttendance();

  useEffect(() => setMounted(true), []);

  // ✅ FIX: include direct role check so admin/manager never fall through to employee view
  const userRole = user?.role ?? '';
  const canManage  = mounted && (
    hasPermission('manage attendance') ||
    userRole === 'admin' ||
    userRole === 'hr'
  );
  const isAdmin    = mounted && (
    hasPermission('manage attendance') ||
    hasPermission('view all attendance') ||
    userRole === 'admin' ||
    userRole === 'hr' ||
    userRole === 'manager'
  );
  const isEmployee = mounted && !isAdmin;

  const departments      = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];
  const scopedEmployeeId = isAdmin ? undefined : user?.employee_id;

  const { data: backendWorksheet, isLoading: isWorksheetLoading } = useWorksheet({
    date:        selectedDate,
    page,
    per_page:    10,
    employee_id: scopedEmployeeId,
    enabled:     isAdmin && tab === 'daily',
  } as any);

  useEffect(() => {
    if (backendWorksheet?.data) {
      setWorksheetData(backendWorksheet.data.map((item: WorksheetItem) => ({ ...item, selected: false })));
    }
  }, [backendWorksheet]);

  const handleRowChange = (index: number, key: keyof WorksheetItem, value: any) =>
    setWorksheetData(prev => prev.map((row, idx) => idx === index ? { ...row, [key]: value } : row));

  const toggleSelectAll = (checked: boolean) =>
    setWorksheetData(prev => prev.map(row =>
      row.note?.includes('On Approved Leave') ? row : { ...row, selected: checked }));

  const activeRows    = worksheetData.filter(r => !r.note?.includes('On Approved Leave'));
  const isAllSelected = activeRows.length > 0 && activeRows.every(r => r.selected);
  const selectedCount = worksheetData.filter(r => r.selected).length;

  const applyGlobalTimeModifications = () =>
    setWorksheetData(prev => prev.map(row => {
      if (!row.selected || row.note?.includes('On Approved Leave')) return row;
      return {
        ...row,
        check_in:       globalStatus === 'absent' ? '' : globalIn,
        check_out:      globalStatus === 'absent' ? '' : globalOut,
        overtime_hours: globalStatus === 'absent' ? 0 : row.overtime_hours,
        status:         globalStatus as any,
      };
    }));

  const handleBulkSavePayload = () =>
    saveBulk({ date: selectedDate, records: worksheetData.map(
      ({ employee_id, check_in, check_out, status, overtime_hours, note }) => ({
        employee_id,
        check_in:       status === 'absent' ? '' : check_in,
        check_out:      status === 'absent' ? '' : check_out,
        status, overtime_hours: status === 'absent' ? 0 : overtime_hours, note,
      })
    )});

  const prevAdminMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextAdminMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const filteredWorksheet = worksheetData.filter(
    row => !filterDept || row.department === departments.find((d: any) => d.id === Number(filterDept))?.name
  );
  const colSpan = isAdmin ? 8 : 6;

  // ── Employee view ─────────────────────────────────────────────
  if (isEmployee) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-400">Your personal attendance record</p>
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

  // ── Admin / HR / Manager: worksheet view ──────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-400">Direct tabular row-management sheet layout</p>
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
      </div>

      {tab === 'daily' ? (
        <>
          <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <Input type="date" value={selectedDate}
                onChange={e => { setDate(e.target.value); setPage(1); }}
                className="h-10 w-44" />
              {isAdmin && (
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none bg-transparent">
                  <option value="">All Departments</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>

            {canManage && selectedCount > 0 && (
              <div className="flex items-center gap-2 bg-blue-50/60 p-1.5 rounded-lg border border-blue-100 text-xs text-blue-800 animate-in fade-in duration-200">
                <span className="font-medium pl-1">{selectedCount} Selected:</span>
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
              <Button onClick={handleBulkSavePayload} disabled={isSavingBulk}
                className="bg-green-600 hover:bg-green-500 text-white gap-2 ml-auto h-10 shadow-sm">
                {isSavingBulk ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save size={16}/>}
                Save Entire Sheet
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 select-none">
                  {canManage && (
                    <th className="px-5 py-3.5 w-12 text-left">
                      <button type="button" onClick={() => toggleSelectAll(!isAllSelected)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {isAllSelected ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
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
                    return (
                      <tr key={row.employee_id} className={`transition-colors ${
                        isOnLeave ? 'bg-slate-50/40 text-slate-400 select-none' :
                        row.selected ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                        {canManage && (
                          <td className="px-5 py-3.5">
                            <button type="button" disabled={isOnLeave}
                              onClick={() => handleRowChange(index,'selected',!row.selected)}
                              className={`text-slate-400 transition-colors ${isOnLeave?'opacity-20 cursor-not-allowed':'hover:text-slate-600'}`}>
                              {row.selected ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
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
                          <Input type="time" disabled={!canManage||row.status==='absent'||isOnLeave}
                            value={row.status==='absent'?'':row.check_in}
                            onChange={e => handleRowChange(index,'check_in',e.target.value)}
                            className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"/>
                        </td>
                        <td className="px-5 py-3.5">
                          <Input type="time" disabled={!canManage||row.status==='absent'||isOnLeave}
                            value={row.status==='absent'?'':row.check_out}
                            onChange={e => handleRowChange(index,'check_out',e.target.value)}
                            className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"/>
                        </td>
                        <td className="px-5 py-3.5">
                          <Input type="number" disabled={!canManage||row.status==='absent'||isOnLeave}
                            step="0.5" min="0" max="12"
                            value={row.status==='absent'?0:row.overtime_hours}
                            onChange={e => handleRowChange(index,'overtime_hours',Number(e.target.value))}
                            className="h-9 text-xs bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"/>
                        </td>
                        <td className="px-5 py-3.5">
                          <select disabled={!canManage||isOnLeave} value={row.status}
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
      ) : (
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
    </div>
  );
}