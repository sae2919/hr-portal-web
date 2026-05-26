'use client';

import { useState, useEffect } from 'react';
import { useWorksheet, useSaveBulkAttendance, useMonthlyReport, WorksheetItem } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Clock, ChevronLeft, ChevronRight, BarChart3,
  CheckSquare, Square, Save, Check, Plane,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── Status Configurations ─────────────────────────────────────────
const statusOptions = [
  { value: 'present',  label: 'Present',  color: 'bg-green-50 text-green-700 border-green-100' },
  { value: 'absent',   label: 'Absent',   color: 'bg-red-50 text-red-600 border-red-100' },
  { value: 'late',     label: 'Late',     color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  { value: 'half_day', label: 'Half Day', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { value: 'holiday',  label: 'Holiday',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
];

// ── Monthly Report Tab ────────────────────────────────────────────
function MonthlyReportTab({
  month,
  year,
  employeeId,
  isAdmin,
}: {
  month: number;
  year: number;
  employeeId?: number;
  isAdmin: boolean;
}) {
  const { data, isLoading } = useMonthlyReport(month, year, employeeId);
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
            {/* Hide Employee/Department columns for non-admins — they only see themselves */}
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
            <tr>
              <td colSpan={isAdmin ? 7 : 5} className="text-center py-10">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </td>
            </tr>
          ) : (
            data?.data.map((row) => (
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
  const [page, setPage]             = useState(1);
  const [month, setMonth]           = useState(nowMonth);
  const [year, setYear]             = useState(nowYear);
  const [filterDept, setFilterDept] = useState('');

  // Bulk edit states (admin only)
  const [globalIn, setGlobalIn]           = useState('09:00');
  const [globalOut, setGlobalOut]         = useState('18:00');
  const [globalStatus, setGlobalStatus]   = useState('present');
  const [worksheetData, setWorksheetData] = useState<WorksheetItem[]>([]);
  const [mounted, setMounted]             = useState(false);

  const { hasPermission, user } = useAuthStore();
  const { data: departmentsResponse }         = useDepartments();
  const { mutate: saveBulk, isPending: isSavingBulk } = useSaveBulkAttendance();

  useEffect(() => setMounted(true), []);

  const canManage = mounted && hasPermission('manage attendance');
  const isAdmin   = mounted && (hasPermission('manage attendance') || hasPermission('view all attendance'));

  const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

  // Non-admins are scoped to their own employee_id
  const scopedEmployeeId = isAdmin ? undefined : user?.employee_id;

  const { data: backendWorksheet, isLoading: isWorksheetLoading } = useWorksheet({
    date:        selectedDate,
    page,
    per_page:    10,
    employee_id: scopedEmployeeId,   // ← key change: scope to self for employees
  });

  // Sync backend data into local mutable state
  useEffect(() => {
    if (backendWorksheet?.data) {
      setWorksheetData(backendWorksheet.data.map((item) => ({ ...item, selected: false })));
    }
  }, [backendWorksheet]);

  // Individual row change
  const handleRowChange = (index: number, key: keyof WorksheetItem, value: any) => {
    setWorksheetData((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row))
    );
  };

  // Select all (skip leave rows)
  const toggleSelectAll = (checked: boolean) => {
    setWorksheetData((prev) =>
      prev.map((row) => {
        if (row.note?.includes('On Approved Leave')) return row;
        return { ...row, selected: checked };
      })
    );
  };

  const activeRows      = worksheetData.filter((r) => !r.note?.includes('On Approved Leave'));
  const isAllSelected   = activeRows.length > 0 && activeRows.every((r) => r.selected);
  const selectedCount   = worksheetData.filter((r) => r.selected).length;

  // Apply global time/status to selected rows
  const applyGlobalTimeModifications = () => {
    setWorksheetData((prev) =>
      prev.map((row) => {
        if (row.selected && !row.note?.includes('On Approved Leave')) {
          return {
            ...row,
            check_in:       globalStatus === 'absent' ? '' : globalIn,
            check_out:      globalStatus === 'absent' ? '' : globalOut,
            overtime_hours: globalStatus === 'absent' ? 0 : row.overtime_hours,
            status:         globalStatus as any,
          };
        }
        return row;
      })
    );
  };

  // Save entire sheet
  const handleBulkSavePayload = () => {
    const cleanRecords = worksheetData.map(
      ({ employee_id, check_in, check_out, status, overtime_hours, note }) => ({
        employee_id,
        check_in:       status === 'absent' ? '' : check_in,
        check_out:      status === 'absent' ? '' : check_out,
        status,
        overtime_hours: status === 'absent' ? 0 : overtime_hours,
        note,
      })
    );
    saveBulk({ date: selectedDate, records: cleanRecords });
  };

  // Month nav
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Department filter (client-side, for admins only)
  const filteredWorksheet = worksheetData.filter(
    (row) => !filterDept || row.department === departments.find((d) => d.id === Number(filterDept))?.name
  );

  // Column count helper
  const colSpan = isAdmin ? 8 : 6;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-400">
            {isAdmin ? 'Direct tabular row-management sheet layout' : 'Your personal attendance record'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('daily')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setTab('monthly')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={14} /> Monthly Report
        </button>
      </div>

      {tab === 'daily' ? (
        <>
          {/* Filters Bar */}
          <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setDate(e.target.value); setPage(1); }}
                className="h-10 w-44"
              />
              {/* Department filter — admins only */}
              {isAdmin && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none bg-transparent"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Bulk edit toolbar — admins only */}
            {canManage && selectedCount > 0 && (
              <div className="flex items-center gap-2 bg-blue-50/60 p-1.5 rounded-lg border border-blue-100 text-xs text-blue-800 animate-in fade-in duration-200">
                <span className="font-medium pl-1">{selectedCount} Selected:</span>
                <Input
                  type="time"
                  disabled={globalStatus === 'absent'}
                  value={globalStatus === 'absent' ? '' : globalIn}
                  onChange={(e) => setGlobalIn(e.target.value)}
                  className="h-7 w-24 px-1 bg-white"
                />
                <Input
                  type="time"
                  disabled={globalStatus === 'absent'}
                  value={globalStatus === 'absent' ? '' : globalOut}
                  onChange={(e) => setGlobalOut(e.target.value)}
                  className="h-7 w-24 px-1 bg-white"
                />
                <select
                  value={globalStatus}
                  onChange={(e) => setGlobalStatus(e.target.value)}
                  className="border border-slate-200 rounded px-1.5 h-7 text-xs bg-white"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  type="button"
                  onClick={applyGlobalTimeModifications}
                  className="bg-blue-600 hover:bg-blue-500 h-7 text-white text-xs px-2.5"
                >
                  Apply All
                </Button>
              </div>
            )}

            {canManage && (
              <Button
                onClick={handleBulkSavePayload}
                disabled={isSavingBulk}
                className="bg-green-600 hover:bg-green-500 text-white gap-2 ml-auto h-10 shadow-sm"
              >
                {isSavingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                Save Entire Sheet
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 select-none">
                  {/* Checkbox col — admins only */}
                  {canManage && (
                    <th className="px-5 py-3.5 w-12 text-left">
                      <button
                        type="button"
                        onClick={() => toggleSelectAll(!isAllSelected)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {isAllSelected
                          ? <CheckSquare size={18} className="text-blue-600" />
                          : <Square size={18} />}
                      </button>
                    </th>
                  )}
                  {/* Employee / Department cols — admins only */}
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
                  <tr>
                    <td colSpan={colSpan} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filteredWorksheet.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="text-center py-12">
                      <Clock className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                      <p className="text-slate-400 text-sm">No attendance record found</p>
                    </td>
                  </tr>
                ) : (
                  filteredWorksheet.map((row, index) => {
                    const isOnLeave = row.note?.includes('On Approved Leave');

                    return (
                      <tr
                        key={row.employee_id}
                        className={`transition-colors ${
                          isOnLeave
                            ? 'bg-slate-50/40 text-slate-400 select-none'
                            : row.selected
                            ? 'bg-blue-50/20'
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Checkbox — admin only */}
                        {canManage && (
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              disabled={isOnLeave}
                              onClick={() => handleRowChange(index, 'selected', !row.selected)}
                              className={`text-slate-400 transition-colors ${
                                isOnLeave ? 'opacity-20 cursor-not-allowed' : 'hover:text-slate-600'
                              }`}
                            >
                              {row.selected
                                ? <CheckSquare size={18} className="text-blue-600" />
                                : <Square size={18} />}
                            </button>
                          </td>
                        )}

                        {/* Employee / Department — admin only */}
                        {isAdmin && (
                          <>
                            <td className="px-5 py-3.5">
                              <p className={`font-medium ${isOnLeave ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {row.name}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-sm">{row.department}</td>
                          </>
                        )}

                        {/* Check In */}
                        <td className="px-5 py-3.5">
                          <Input
                            type="time"
                            disabled={!canManage || row.status === 'absent' || isOnLeave}
                            value={row.status === 'absent' ? '' : row.check_in}
                            onChange={(e) => handleRowChange(index, 'check_in', e.target.value)}
                            className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"
                          />
                        </td>

                        {/* Check Out */}
                        <td className="px-5 py-3.5">
                          <Input
                            type="time"
                            disabled={!canManage || row.status === 'absent' || isOnLeave}
                            value={row.status === 'absent' ? '' : row.check_out}
                            onChange={(e) => handleRowChange(index, 'check_out', e.target.value)}
                            className="h-9 font-mono text-xs bg-transparent disabled:opacity-40"
                          />
                        </td>

                        {/* OT Hours */}
                        <td className="px-5 py-3.5">
                          <Input
                            type="number"
                            disabled={!canManage || row.status === 'absent' || isOnLeave}
                            step="0.5"
                            min="0"
                            max="12"
                            value={row.status === 'absent' ? 0 : row.overtime_hours}
                            onChange={(e) => handleRowChange(index, 'overtime_hours', Number(e.target.value))}
                            className="h-9 text-xs bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <select
                            disabled={!canManage || isOnLeave}
                            value={row.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value;
                              handleRowChange(index, 'status', nextStatus);
                              if (nextStatus === 'absent') {
                                handleRowChange(index, 'check_in', '');
                                handleRowChange(index, 'check_out', '');
                                handleRowChange(index, 'overtime_hours', 0);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs h-9 focus:outline-none bg-transparent font-medium disabled:opacity-50"
                          >
                            {statusOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Verification badge */}
                        <td className="px-5 py-3.5">
                          {isOnLeave ? (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 shadow-none font-normal gap-1 rounded-md animate-pulse">
                              <Plane size={12} /> On Approved Leave
                            </Badge>
                          ) : row.is_saved ? (
                            <Badge className="bg-green-50 text-green-700 border border-green-200 shadow-none font-normal gap-1 rounded-md">
                              <Check size={12} /> Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal rounded-md">
                              Unsaved
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {backendWorksheet && backendWorksheet.last_page > 1 && (
              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between select-none">
                <span className="text-xs text-slate-500 font-medium">
                  Page {backendWorksheet.current_page} of {backendWorksheet.last_page} ({backendWorksheet.total} records)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft size={14} /> Prev
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={page === backendWorksheet.last_page}
                    onClick={() => setPage((p) => Math.min(p + 1, backendWorksheet.last_page))}
                    className="h-8 text-xs gap-1"
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Month Navigator */}
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-fit">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 w-36 text-center">
              {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <MonthlyReportTab
            month={month}
            year={year}
            employeeId={scopedEmployeeId}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  );
}