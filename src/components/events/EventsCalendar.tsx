'use client';

import { useState, useEffect } from 'react';
import { eventService, Event, TodaySpecial } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Edit, Trash2,
  Gift, Cake, Building2, Briefcase, Clock, MapPin, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const eventTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  holiday: { label: 'Holiday', icon: Star, color: 'text-red-600', bg: 'bg-red-50' },
  birthday: { label: 'Birthday', icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50' },
  company_event: { label: 'Company Event', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  meeting: { label: 'Meeting', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
  training: { label: 'Training', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  other: { label: 'Other', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50' },
};

export default function EventsCalendar() {
  const { user, hasPermission } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [todaySpecial, setTodaySpecial] = useState<TodaySpecial | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  
  const isAdmin = hasPermission('admin') || hasPermission('hr');

  useEffect(() => {
    fetchEvents();
    fetchTodaySpecial();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await eventService.getEvents({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });
      if (res.success) {
        setEvents(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
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

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50 rounded-lg"></div>);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.event_date === dateStr);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      
      days.push(
        <div 
          key={day} 
          className={`min-h-24 p-2 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'} hover:shadow-md transition`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>{day}</span>
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 3).map(event => {
              const config = eventTypeConfig[event.type];
              return (
                <div 
                  key={event.id} 
                  className={`text-xs p-1 rounded cursor-pointer ${config.bg} ${config.color}`}
                  onClick={() => { setSelectedEvent(event); setShowEventModal(true); }}
                >
                  {event.title}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-400">+{dayEvents.length - 3} more</div>
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
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-5 border border-pink-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Gift size={20} className="text-pink-500" />
            Today's Special
          </h3>
          <div className="space-y-2">
            {todaySpecial.birthdays.map(b => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <Cake size={16} className="text-pink-500" />
                <span className="font-medium">{b.first_name} {b.last_name}</span>
                <span className="text-slate-500">is celebrating their birthday today!</span>
              </div>
            ))}
            {todaySpecial.anniversaries.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <Star size={16} className="text-purple-500" />
                <span className="font-medium">{a.first_name} {a.last_name}</span>
                <span className="text-slate-500">is celebrating their work anniversary!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            Today
          </button>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedEvent(null); setShowEventModal(true); }} className="gap-2">
            <Plus size={16} /> Add Event
          </Button>
        )}
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          isAdmin={isAdmin}
          onClose={() => setShowEventModal(false)}
          onSave={() => { fetchEvents(); setShowEventModal(false); }}
        />
      )}
    </div>
  );
}

// Event Modal Component
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{event ? 'Edit Event' : 'Add Event'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
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
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              rows={3}
              placeholder="Event description"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {event && isAdmin && (
              <Button variant="destructive" onClick={handleDelete} className="flex-1">
                <Trash2 size={16} className="mr-2" /> Delete
              </Button>
            )}
            <Button onClick={handleSubmit} className="flex-1">
              {event ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}