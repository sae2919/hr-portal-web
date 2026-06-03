'use client';

import { useState, useEffect } from 'react';
import { eventService, Event, TodaySpecial } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Edit, Trash2,
  Gift, Cake, Building2, Briefcase, Clock, MapPin, Star, User, Info, Plane, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const eventTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  holiday: { label: 'Holiday', icon: Star, color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100/50' },
  birthday: { label: 'Birthday', icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50 hover:bg-pink-100/50' },
  company_event: { label: 'Company Event', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100/50' },
  meeting: { label: 'Meeting', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100/50' },
  training: { label: 'Training', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100/50' },
  other: { label: 'Other', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50 hover:bg-slate-100/50' },
};

export default function EventsCalendar() {
  const { user, hasPermission } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [todaySpecial, setTodaySpecial] = useState<TodaySpecial | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCustomItem, setSelectedCustomItem] = useState<any | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr' || hasPermission('manage events') || hasPermission('manage calendar');

  useEffect(() => {
    fetchEventsAndData();
    fetchTodaySpecial();
  }, [currentDate]);

  const fetchEventsAndData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Events
      const eventsRes = await eventService.getEvents({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });
      if (eventsRes.success) {
        setEvents(eventsRes.data);
      }

      // 2. Fetch Employees (for birthdays & anniversaries)
      const empRes = await api.get('/employees', { params: { status: 'active', per_page: 1000 } });
      if (empRes.data?.data) {
        setEmployees(empRes.data.data);
      }

      // 3. Fetch Month Leaves
      const leavesRes = await api.get('/attendance/month-leaves', {
        params: {
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        }
      });
      if (leavesRes.data?.data) {
        setLeaves(leavesRes.data.data);
      }

    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySpecial = async () => {
    try {
      const res = await eventService.getTodaySpecial();
      if (res.success) {
        setTodaySpecial(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch today special:', error);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleItemClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'custom_event') {
      setSelectedEvent(item.originalData);
      setShowEventModal(true);
    } else {
      setSelectedCustomItem(item);
      setShowCustomModal(true);
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-24 bg-slate-50/50 border border-slate-100 rounded-lg"></div>);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      
      const displayItems: any[] = [];

      // 1. Custom events
      const dayEvents = events.filter(e => e.event_date === dateStr);
      dayEvents.forEach(e => {
        const config = eventTypeConfig[e.type] || eventTypeConfig.other;
        displayItems.push({
          id: `event-${e.id}`,
          title: e.title,
          type: 'custom_event',
          originalData: e,
          bg: config.bg,
          color: config.color,
        });
      });

      // 2. Birthdays (active employees)
      const dayBirthdays = employees.filter(emp => {
        if (!emp.dob) return false;
        const dobParts = emp.dob.split('-');
        return dobParts.length >= 3 && parseInt(dobParts[1]) === (month + 1) && parseInt(dobParts[2]) === day;
      });
      dayBirthdays.forEach(emp => {
        displayItems.push({
          id: `birthday-${emp.id}`,
          title: `🎂 ${emp.full_name || `${emp.first_name} ${emp.last_name}`}`,
          type: 'birthday',
          originalData: emp,
          bg: 'bg-pink-50 hover:bg-pink-100/50',
          color: 'text-pink-600',
        });
      });

      // 3. Anniversaries (active employees)
      const dayAnniversaries = employees.filter(emp => {
        if (!emp.joining_date) return false;
        const joinParts = emp.joining_date.split('-');
        return joinParts.length >= 3 && 
               parseInt(joinParts[1]) === (month + 1) && 
               parseInt(joinParts[2]) === day && 
               parseInt(joinParts[0]) < year;
      });
      dayAnniversaries.forEach(emp => {
        const joinYear = parseInt(emp.joining_date.split('-')[0]);
        const yrs = year - joinYear;
        displayItems.push({
          id: `anniversary-${emp.id}`,
          title: `⭐ ${emp.full_name || `${emp.first_name} ${emp.last_name}`} (${yrs} yr${yrs > 1 ? 's' : ''})`,
          type: 'anniversary',
          originalData: emp,
          bg: 'bg-violet-50 hover:bg-violet-100/50',
          color: 'text-violet-600',
        });
      });

      // 4. Leaves
      const dayLeaves = leaves.filter(l => dateStr >= l.start_date && dateStr <= l.end_date);
      dayLeaves.forEach(l => {
        displayItems.push({
          id: `leave-${l.leave_id}`,
          title: `✈ ${l.employee_name} (Leave)`,
          type: 'leave',
          originalData: l,
          bg: 'bg-blue-50 hover:bg-blue-100/50',
          color: 'text-blue-600',
        });
      });

      days.push(
        <div 
          key={day} 
          className={`min-h-24 p-2 rounded-lg border flex flex-col justify-between ${isToday ? 'bg-blue-50/20 border-blue-300' : 'bg-white border-slate-200'} hover:shadow-md transition`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xs font-bold rounded-md w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {day}
            </span>
          </div>
          <div className="mt-1 space-y-1 overflow-hidden flex-1 flex flex-col justify-end">
            {displayItems.slice(0, 3).map(item => (
              <div 
                key={item.id} 
                className={`text-[9px] font-semibold p-1 rounded cursor-pointer truncate ${item.bg} ${item.color}`}
                onClick={(e) => handleItemClick(item, e)}
              >
                {item.title}
              </div>
            ))}
            {displayItems.length > 3 && (
              <div className="text-[9px] text-slate-400 font-bold pl-1">+{displayItems.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Today's Special Section */}
      {todaySpecial && (todaySpecial.birthdays.length > 0 || todaySpecial.anniversaries.length > 0) && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-5 border border-pink-100 shadow-sm animate-in fade-in duration-300">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Gift size={18} className="text-pink-500" />
            Today's Special
          </h3>
          <div className="space-y-2">
            {todaySpecial.birthdays.map(b => (
              <div key={b.id} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <Cake size={14} className="text-pink-500" />
                <span>{b.first_name} {b.last_name}</span>
                <span className="text-slate-400 font-medium">is celebrating their birthday today! 🎂</span>
              </div>
            ))}
            {todaySpecial.anniversaries.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <Star size={14} className="text-purple-500" />
                <span>{a.first_name} {a.last_name}</span>
                <span className="text-slate-400 font-medium">is celebrating their work anniversary ({a.years_of_service} yr{a.years_of_service !== 1 ? 's' : ''})! ⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Company Events Calendar</h3>
            <p className="text-xs text-slate-400">Company events, leaves, birthdays, and anniversaries</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2.5 hover:bg-slate-200/60 text-slate-600 transition-colors border-r border-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 py-2 text-sm font-bold text-slate-700 min-w-[125px] text-center select-none">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2.5 hover:bg-slate-200/60 text-slate-600 transition-colors border-l border-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="h-10 px-4 text-sm font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Today
          </button>
          {isAdmin && (
            <Button onClick={() => { setSelectedEvent(null); setShowEventModal(true); }} className="gap-1.5 h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-none border-0">
              <Plus size={14} /> Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid Container */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4 overflow-hidden">
          {/* Weekdays Labels */}
          <div className="grid grid-cols-7 gap-2 text-center border-b border-slate-100 pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-semibold select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" />
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-pink-50 border border-pink-200 inline-block" />
              <span>Birthday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-violet-50 border border-violet-200 inline-block" />
              <span>Work Anniversary</span>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          isAdmin={isAdmin}
          onClose={() => setShowEventModal(false)}
          onSave={() => { fetchEventsAndData(); setShowEventModal(false); }}
        />
      )}

      {/* Custom Item Details Modal (Leaves, Birthdays, Anniversaries) */}
      {showCustomModal && selectedCustomItem && (
        <CustomDetailModal
          item={selectedCustomItem}
          onClose={() => { setShowCustomModal(false); setSelectedCustomItem(null); }}
        />
      )}
    </div>
  );
}

// ── Event Modal Component ──────────────────────────────────────────
function EventModal({ event, isAdmin, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    type: event?.type || 'company_event',
    event_date: event?.event_date || '',
    description: event?.description || '',
    location: event?.location || '',
  });

  const handleSubmit = async () => {
    try {
      if (event) {
        await eventService.updateEvent(event.id, formData);
        toast.success('Event updated successfully');
      } else {
        await eventService.createEvent(formData);
        toast.success('Event created successfully');
      }
      onSave();
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventService.deleteEvent(event.id);
        toast.success('Event deleted successfully');
        onSave();
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-slate-800">{event ? (isAdmin ? 'Edit Event' : 'Event Details') : 'Add Event'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
              disabled={!isAdmin}
              className="h-10 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full h-10 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              disabled={!isAdmin}
            >
              <option value="holiday">Holiday</option>
              <option value="birthday">Birthday</option>
              <option value="company_event">Company Event</option>
              <option value="meeting">Meeting</option>
              <option value="training">Training</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Date</label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              disabled={!isAdmin}
              className="h-10 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Location (e.g. Office, Remote, Zoom)"
              disabled={!isAdmin}
              className="h-10 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              rows={3}
              placeholder="Event description"
              disabled={!isAdmin}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            {isAdmin ? (
              <>
                {event && (
                  <Button variant="destructive" onClick={handleDelete} className="flex-1 h-10 rounded-xl font-bold">
                    <Trash2 size={16} className="mr-2" /> Delete
                  </Button>
                )}
                <Button onClick={handleSubmit} className="flex-1 h-10 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white">
                  {event ? 'Update' : 'Create'}
                </Button>
              </>
            ) : (
              <Button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 h-10 rounded-xl font-bold">
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Item Details Modal Component (Birthdays, Anniversaries, Leaves) ──
function CustomDetailModal({ item, onClose }: any) {
  const { originalData, type } = item;

  let title = '';
  let icon: any = Info;
  let bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
  let bodyContent = null;

  if (type === 'birthday') {
    title = 'Employee Birthday';
    icon = Cake;
    bgClass = 'bg-pink-50 text-pink-700 border-pink-100';
    bodyContent = (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 text-center leading-relaxed">
          Celebrating <span className="font-extrabold text-pink-600">{originalData.full_name || `${originalData.first_name} ${originalData.last_name}`}</span>'s birthday today! 🎂
        </p>
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs font-semibold text-slate-600">
          <div className="flex justify-between"><span className="text-slate-400">Department:</span> <span>{originalData.department?.name || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Designation:</span> <span>{originalData.designation?.title || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Email:</span> <span>{originalData.email || 'N/A'}</span></div>
          {originalData.dob && (
            <div className="flex justify-between"><span className="text-slate-400">Date of Birth:</span> <span>{new Date(originalData.dob).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}</span></div>
          )}
        </div>
      </div>
    );
  } else if (type === 'anniversary') {
    title = 'Work Anniversary';
    icon = Star;
    bgClass = 'bg-violet-50 text-violet-700 border-violet-100';
    const joinYear = parseInt(originalData.joining_date.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const yrs = currentYear - joinYear;

    bodyContent = (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 text-center leading-relaxed">
          Celebrating <span className="font-extrabold text-violet-600">{originalData.full_name || `${originalData.first_name} ${originalData.last_name}`}</span>'s work anniversary! Thank you for <span className="font-extrabold text-violet-600">{yrs} year{yrs !== 1 ? 's' : ''}</span> of valuable service! ⭐
        </p>
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs font-semibold text-slate-600">
          <div className="flex justify-between"><span className="text-slate-400">Department:</span> <span>{originalData.department?.name || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Designation:</span> <span>{originalData.designation?.title || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Joining Date:</span> <span>{new Date(originalData.joining_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
        </div>
      </div>
    );
  } else if (type === 'leave') {
    title = 'Employee Out of Office';
    icon = Plane;
    bgClass = 'bg-blue-50 text-blue-700 border-blue-100';
    bodyContent = (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 text-center leading-relaxed">
          <span className="font-extrabold text-blue-600">{originalData.employee_name}</span> is on approved leave today. ✈
        </p>
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs font-semibold text-slate-600">
          <div className="flex justify-between"><span className="text-slate-400">Department:</span> <span>{originalData.department || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Leave Type:</span> <span>{originalData.leave_type || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Duration:</span> <span className="text-blue-600 font-bold">{new Date(originalData.start_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(originalData.end_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span></div>
        </div>
      </div>
    );
  }

  const IconComponent = icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center border ${bgClass}`}>
              <IconComponent size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {bodyContent}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white h-10 rounded-xl font-bold text-xs shadow-none border-0">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}