'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { resolveRoleTier } from '@/hooks/useAuth';
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from '@/hooks/useHolidays';
import { useMonthLeaves, MonthLeave } from '@/hooks/useLeaves';
import { Holiday } from '@/types/holiday';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Info,
  Check,
  Loader2,
  Plane,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const holidayTypeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  public: {
    label: 'Public Holiday',
    bg: 'bg-rose-50 hover:bg-rose-100/50',
    text: 'text-rose-700',
    border: 'border-rose-100',
  },
  optional: {
    label: 'Optional Holiday',
    bg: 'bg-amber-50 hover:bg-amber-100/50',
    text: 'text-amber-700',
    border: 'border-amber-100',
  },
  restricted: {
    label: 'Restricted Holiday',
    bg: 'bg-purple-50 hover:bg-purple-100/50',
    text: 'text-purple-700',
    border: 'border-purple-100',
  },
};

export default function LeaveCalendar() {
  const { user, hasPermission } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedLeaves, setSelectedLeaves] = useState<MonthLeave[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const roleTier = resolveRoleTier(user);
  const isAdmin =
    roleTier === 'admin' ||
    roleTier === 'hr' ||
    roleTier === 'super_admin' ||
    roleTier === 'super admin' ||
    hasPermission('manage leaves') ||
    hasPermission('manage calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: responseHolidays, isLoading: loadingHolidays } = useHolidays({ year, month });
  const { data: responseLeaves, isLoading: loadingLeaves } = useMonthLeaves({ year, month });

  const holidays = responseHolidays?.data ?? [];
  const monthLeaves = responseLeaves?.data ?? [];
  const isLoading = loadingHolidays || loadingLeaves;

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dayDate: Date, holiday: Holiday | null, dayLeaves: MonthLeave[]) => {
    setSelectedDate(dayDate);
    setSelectedHoliday(holiday);
    setSelectedLeaves(dayLeaves);
    setIsEditMode(!holiday); // Default to add holiday if no holiday exists (for admin)
    
    // Open modal if there is a holiday, leaves, or if user is Admin
    if (holiday || dayLeaves.length > 0 || isAdmin) {
      setShowModal(true);
    }
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days = [];

    // Empty cells for padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="min-h-[120px] bg-slate-50/50 border border-slate-100 rounded-xl"
        />
      );
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Match holiday
      const holiday = holidays.find((h) => h.date === dateStr);
      // Match leaves
      const dayLeaves = monthLeaves.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);

      const isToday =
        today.getDate() === day &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();

      const holidayCfg = holiday ? holidayTypeConfig[holiday.type] : null;

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(dayDate, holiday || null, dayLeaves)}
          className={`min-h-[120px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
            isToday
              ? 'bg-blue-50/30 border-blue-300 hover:shadow-md'
              : holiday
              ? `${holidayCfg?.bg} border-rose-100 hover:shadow-md`
              : dayLeaves.length > 0
              ? 'bg-indigo-50/20 border-indigo-100 hover:shadow-md'
              : 'bg-white border-slate-100 hover:bg-slate-50/50 hover:border-slate-200'
          }`}
        >
          {/* Day Number and Badges */}
          <div className="flex justify-between items-start">
            <span
              className={`text-sm font-semibold rounded-lg w-7 h-7 flex items-center justify-center transition-all ${
                isToday
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : holiday
                  ? `${holidayCfg?.text} font-bold`
                  : 'text-slate-600 group-hover:text-slate-950'
              }`}
            >
              {day}
            </span>
            {holiday && (
              <Badge className={`text-[9px] px-1.5 py-0.5 capitalize shadow-none border ${holidayCfg?.text} ${holidayCfg?.bg} ${holidayCfg?.border}`}>
                {holiday.type}
              </Badge>
            )}
          </div>

          {/* Calendar Content (Holidays or Leaves) */}
          <div className="mt-1 space-y-1 w-full overflow-hidden flex-1 flex flex-col justify-end">
            {holiday && (
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-tight truncate ${holidayCfg?.bg} ${holidayCfg?.text} ${holidayCfg?.border}`}>
                🎉 {holiday.name}
              </div>
            )}

            {dayLeaves.slice(0, 2).map((leave) => (
              <div
                key={leave.leave_id}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-50/80 border border-blue-100 text-blue-700 truncate flex items-center gap-1 shadow-sm leading-normal"
                title={`${leave.employee_name} (${leave.leave_type})`}
              >
                <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate">{leave.employee_name}</span>
              </div>
            ))}

            {dayLeaves.length > 2 && (
              <div className="text-[9px] font-bold text-slate-400 pl-1">
                +{dayLeaves.length - 2} more on leave
              </div>
            )}

            {!holiday && dayLeaves.length === 0 && isAdmin && (
              <span className="opacity-0 group-hover:opacity-100 text-[9px] text-blue-600 font-bold flex items-center gap-0.5 mt-auto self-end transition-opacity">
                <Plus size={10} /> Add Holiday
              </span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Leave & Holidays Calendar</h3>
            <p className="text-xs text-slate-400">View official company holidays and employee leaves</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 hover:bg-slate-200/60 text-slate-600 transition-colors border-r border-slate-200"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 py-2 text-sm font-bold text-slate-700 min-w-[120px] text-center select-none">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2.5 hover:bg-slate-200/60 text-slate-600 transition-colors border-l border-slate-200"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-10 px-4 rounded-xl text-slate-600 border-slate-200 bg-white hover:bg-slate-50 font-semibold"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Grid Calendar */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4 overflow-hidden">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-3 text-center border-b border-slate-100 pb-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div
                key={day}
                className="text-xs font-bold text-slate-400 tracking-wider uppercase py-1 select-none"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-3">
            {renderDays()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-semibold select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-200 inline-block" />
              <span>Company Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />
              <span>Employee on Leave</span>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showModal && selectedDate && (
        <DayDetailsModal
          date={selectedDate}
          holiday={selectedHoliday}
          leaves={selectedLeaves}
          isAdmin={isAdmin}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          onClose={() => {
            setShowModal(false);
            setSelectedDate(null);
            setSelectedHoliday(null);
            setSelectedLeaves([]);
          }}
        />
      )}
    </div>
  );
}

// ── Day Details Modal Component ──────────────────────────────────────────
interface DayDetailsModalProps {
  date: Date;
  holiday: Holiday | null;
  leaves: MonthLeave[];
  isAdmin: boolean;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  onClose: () => void;
}

function DayDetailsModal({
  date,
  holiday,
  leaves,
  isAdmin,
  isEditMode,
  setIsEditMode,
  onClose,
}: DayDetailsModalProps) {
  const { mutate: createHoliday, isPending: creating } = useCreateHoliday();
  const { mutate: updateHoliday, isPending: updating } = useUpdateHoliday();
  const { mutate: deleteHoliday, isPending: deleting } = useDeleteHoliday();

  const [name, setName] = useState(holiday?.name ?? '');
  const [type, setType] = useState<'public' | 'optional' | 'restricted'>(holiday?.type ?? 'public');
  const [description, setDescription] = useState(holiday?.description ?? '');
  const [isRecurring, setIsRecurring] = useState(holiday?.is_recurring ?? false);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dbDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Holiday name is required');
      return;
    }

    if (holiday) {
      updateHoliday(
        {
          id: holiday.id,
          name,
          type,
          description: description || undefined,
          is_recurring: isRecurring,
        },
        { onSuccess: onClose }
      );
    } else {
      createHoliday(
        {
          name,
          date: dbDateStr,
          type,
          description: description || undefined,
          is_recurring: isRecurring,
        },
        { onSuccess: onClose }
      );
    }
  };

  const handleDelete = () => {
    if (!holiday) return;
    if (confirm(`Are you sure you want to delete "${holiday.name}"?`)) {
      deleteHoliday(holiday.id, { onSuccess: onClose });
    }
  };

  const isPending = creating || updating || deleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800">
              {isEditMode && isAdmin
                ? (holiday ? 'Edit Holiday' : 'Add Holiday')
                : 'Day Roster & Info'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        {isEditMode && isAdmin ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name" className="text-sm font-semibold text-slate-700">
                Holiday Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="holiday-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Independence Day"
                className="h-10 rounded-xl"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-type" className="text-sm font-semibold text-slate-700">
                Type
              </Label>
              <select
                id="holiday-type"
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                disabled={isPending}
              >
                <option value="public">Public Holiday</option>
                <option value="optional">Optional Holiday</option>
                <option value="restricted">Restricted Holiday</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-desc" className="text-sm font-semibold text-slate-700">
                Reason / Description
              </Label>
              <textarea
                id="holiday-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this a holiday? (e.g. Celebrated nationwide)"
                rows={3}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 resize-none"
                disabled={isPending}
              />
            </div>

            <div className="flex items-center gap-2 py-1 select-none">
              <input
                type="checkbox"
                id="holiday-recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                disabled={isPending}
              />
              <Label htmlFor="holiday-recurring" className="text-xs font-semibold text-slate-600 cursor-pointer">
                Recurring every year
              </Label>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              {holiday && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 rounded-xl h-10"
                >
                  <Trash2 size={14} className="mr-2" /> Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (holiday) setIsEditMode(false);
                  else onClose();
                }}
                disabled={isPending}
                className="flex-1 rounded-xl h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-10"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        ) : (
          /* View mode */
          <div className="p-6 space-y-5">
            {/* Holiday Details */}
            {holiday && (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">🎉 {holiday.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 capitalize mt-0.5">
                      {holiday.type} Holiday {holiday.is_recurring && '• Recurring'}
                    </p>
                  </div>
                  <Badge className={`capitalize shadow-none border ${holidayTypeConfig[holiday.type]?.text} ${holidayTypeConfig[holiday.type]?.bg} ${holidayTypeConfig[holiday.type]?.border}`}>
                    {holiday.type}
                  </Badge>
                </div>

                <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100/50">
                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                    Holiday Description / Reason
                  </p>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {holiday.description || 'No description provided for this holiday.'}
                  </p>
                </div>
              </div>
            )}

            {/* Leaves Details */}
            {leaves.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane size={14} className="text-indigo-500" />
                  Employees Out of Office ({leaves.length})
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {leaves.map((leave) => (
                    <div
                      key={leave.leave_id}
                      className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50 flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                        <User size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {leave.employee_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {leave.department || 'N/A'} • {leave.leave_type}
                        </p>
                        <p className="text-[10px] text-blue-600 font-bold font-mono mt-1">
                          {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-IN', {
                            month: 'short', day: 'numeric'
                          })} - {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-IN', {
                            month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              {isAdmin && (
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-10 gap-1.5"
                >
                  <Edit size={14} /> {holiday ? 'Edit Holiday' : 'Add Holiday'}
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 rounded-xl h-10"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
