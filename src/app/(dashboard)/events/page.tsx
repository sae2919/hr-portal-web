'use client';

import EventsCalendar from '@/components/events/EventsCalendar';

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Events Calendar</h1>
        <p className="text-sm text-slate-400 mt-1">View holidays, birthdays, and company events</p>
      </div>
      
      <EventsCalendar />
    </div>
  );
}