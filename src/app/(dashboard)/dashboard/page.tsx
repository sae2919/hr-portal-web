'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import BirthdayNotification from '@/components/events/BirthdayNotification';
import { quoteService } from '@/services/quoteService';
import { eventService } from '@/services/eventService';
import { resolveRoleTier } from '@/hooks/useAuth';

// ── Module-level in-memory caches (survive tab switches, reset on full page reload) ──
let _quoteCache: any = null;
let _todaySpecialCache: { birthdays: any[]; anniversaries: any[] } | null = null;
let _upcomingEventsCache: any[] | null = null;

import {
  Users, Clock, Calendar, IndianRupee, TrendingUp, UserCheck,
  AlertCircle, Building2, Loader2, Quote as QuoteIcon, Cake,
  Gift, Sparkles, Heart, XCircle, PartyPopper,
} from 'lucide-react';

const fallbackStats = {
  total_employees: 0, present_today: 0, on_leave: 0,
  pending_leaves: 0, departments: 0, monthly_payroll: 0,
};

const fallbackQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
];

const quickActions = [
  { label: 'Add Employee', icon: Users, href: '/employees/create', roles: ['admin', 'hr'] },
  { label: 'Mark Attendance', icon: Clock, href: '/attendance', roles: ['admin', 'hr', 'manager', 'team_lead'] },
  { label: 'Apply Leave', icon: Calendar, href: '/leaves', roles: ['admin', 'hr', 'manager', 'team_lead', 'employee'] },
  { label: 'Run Payroll', icon: TrendingUp, href: '/payroll', roles: ['admin', 'hr'] },
  { label: 'View Events', icon: Cake, href: '/events', roles: ['admin', 'hr', 'manager', 'team_lead', 'employee'] },
  { label: 'My Team', icon: Users, href: '/my-team', roles: ['admin', 'hr', 'manager', 'team_lead'] },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();
  const tier = resolveRoleTier(user);

  const [stats, setStats] = useState<any>(fallbackStats);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<any>(null);
  const [todaySpecial, setTodaySpecial] = useState<{ birthdays: any[]; anniversaries: any[] }>({ birthdays: [], anniversaries: [] });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const loadStats = useCallback(async (force = false) => {
    if (!isAuthenticated || !token) return;
    // Check sessionStorage cache (2-minute TTL)
    if (!force) {
      try {
        const cached = sessionStorage.getItem('dash_stats');
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < 2 * 60 * 1000) {
            setStats(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore parse errors */ }
    }
    try {
      setLoading(true);
      setApiError(false);
      const res = await api.get('/dashboard/stats', { timeout: 10000 });
      setStats(res.data);
      // Store in sessionStorage with timestamp
      try { sessionStorage.setItem('dash_stats', JSON.stringify({ ts: Date.now(), data: res.data })); } catch { }
    } catch {
      setApiError(true);
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  const loadDailyQuote = async () => {
    // Use in-memory cache — quote only needs to change once per browser session
    if (_quoteCache) { setDailyQuote(_quoteCache); return; }
    try {
      const res = await quoteService.getRandomQuote();
      _quoteCache = res.success && res.data ? res.data : fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setDailyQuote(_quoteCache);
    } catch {
      _quoteCache = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setDailyQuote(_quoteCache);
    }
  };

  const loadTodaySpecial = async () => {
    // Use in-memory cache — birthdays don't change mid-session
    if (_todaySpecialCache) { setTodaySpecial(_todaySpecialCache); return; }
    try {
      const res = await eventService.getTodaySpecial();
      if (res.success && res.data) {
        _todaySpecialCache = { birthdays: res.data.birthdays || [], anniversaries: res.data.anniversaries || [] };
      } else {
        _todaySpecialCache = { birthdays: [], anniversaries: [] };
      }
      setTodaySpecial(_todaySpecialCache);
    } catch {
      _todaySpecialCache = { birthdays: [], anniversaries: [] };
      setTodaySpecial(_todaySpecialCache);
    }
  };

  const loadUpcomingEvents = async () => {
    // Use in-memory cache — upcoming events don't change mid-session
    if (_upcomingEventsCache) { setUpcomingEvents(_upcomingEventsCache); return; }
    try {
      const res = await eventService.getUpcomingEvents();
      const events: any[] = res.success && res.data ? res.data.slice(0, 5) : [];
      _upcomingEventsCache = events;
      setUpcomingEvents(events);
    } catch {
      _upcomingEventsCache = [];
      setUpcomingEvents([]);
    }
  };

  // Retry button passes force=true to bypass cache
  const handleRetryStats = useCallback(() => loadStats(true), [loadStats]);

  useEffect(() => {
    if (!isAuthenticated && token === null) { router.push('/login'); return; }
    if (!isAuthenticated || !user) return;
    if (tier !== 'admin' && tier !== 'hr') { router.replace('/workspace'); return; }
    loadStats();
    loadDailyQuote();
    loadTodaySpecial();
    loadUpcomingEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStats, isAuthenticated, tier, user, router, token]);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-xs text-slate-400 font-medium select-none animate-pulse">Loading dashboard metrics...</p>
      </div>
    );
  }

  const dashboardStats = [
    { label: 'Total Employees', value: stats.total_employees ?? stats.employees ?? 0, icon: Users, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Present Today', value: stats.present_today ?? 0, icon: UserCheck, light: 'bg-green-50', text: 'text-green-600' },
    { label: 'On Leave', value: stats.on_leave ?? 0, icon: Calendar, light: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Pending Leaves', value: stats.pending_leaves ?? 0, icon: AlertCircle, light: 'bg-red-50', text: 'text-red-600' },
    { label: 'Departments', value: stats.departments ?? 0, icon: Building2, light: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Monthly Payroll', value: `₹${Number(stats.monthly_payroll || stats.total_payroll_ytd || 0).toLocaleString('en-IN')}`, icon: IndianRupee, light: 'bg-teal-50', text: 'text-teal-600' },
  ];

  const filteredQuickActions = quickActions.filter(a => a.roles.includes(tier));
  const hasTodaySpecial = todaySpecial.birthdays.length > 0 || todaySpecial.anniversaries.length > 0;

  return (
    <>
      <BirthdayNotification />

      <div className="space-y-6">
        {/* API Error */}
        {apiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <XCircle size={20} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Unable to connect to server</p>
              <p className="text-xs text-amber-600">Showing cached data. Please check your connection.</p>
            </div>
            <button onClick={handleRetryStats} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition">
              Retry
            </button>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋</h2>
              <p className="text-blue-100 text-sm mt-1">Here's what's happening with your organization today.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {user?.role || 'Admin'} Account
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                  <Calendar size={12} />
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="hidden md:block text-6xl opacity-20">
              <Building2 size={80} />
            </div>
          </div>
        </div>

        {/* ── HALF / HALF ROW: Quote  +  Today's Special ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Daily Quote — left half */}
          {dailyQuote && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <QuoteIcon size={15} className="text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  Daily Inspiration
                </span>
              </div>
              <p className="text-base text-slate-700 italic leading-relaxed flex-1">"{dailyQuote.quote}"</p>
              {dailyQuote.author && (
                <p className="text-sm text-amber-600 mt-3 font-medium">— {dailyQuote.author}</p>
              )}
            </div>
          )}

          {/* Today's Special (birthdays + anniversaries) — right half */}
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border border-pink-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                <Cake size={15} className="text-pink-500" />
              </div>
              <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide flex items-center gap-1">
                <Sparkles size={12} className="text-pink-400" />
                Today's Special
              </span>
            </div>

            {hasTodaySpecial ? (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-48 pr-1">
                {todaySpecial.birthdays.map((b: any) => (
                  <div key={b.id ?? b.employee_id ?? b.name} className="flex items-center gap-3 bg-white/70 rounded-xl px-3 py-2">
                    <span className="text-xl">🎂</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.department || ''}</p>
                    </div>
                    <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full shrink-0">Birthday</span>
                  </div>
                ))}
                {todaySpecial.anniversaries.map((a: any) => (
                  <div key={a.id ?? a.employee_id ?? a.name} className="flex items-center gap-3 bg-white/70 rounded-xl px-3 py-2">
                    <span className="text-xl">🎊</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.years_completed ? `${a.years_completed} yr${a.years_completed > 1 ? 's' : ''} • ` : ''}{a.department || ''}</p>
                    </div>
                    <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full shrink-0">Anniversary</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <PartyPopper size={28} className="text-pink-200 mb-2" />
                <p className="text-sm text-slate-400">No birthdays or anniversaries today</p>
              </div>
            )}
          </div>
        </div>
        {/* ── END HALF/HALF ── */}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cake size={18} className="text-pink-500" />
              <h3 className="text-sm font-semibold text-slate-700">Upcoming Events</h3>
              <span className="text-xs text-slate-400">Next 30 days</span>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Gift size={16} className="text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{event.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-600 capitalize">
                    {event.type === 'holiday' ? 'Holiday' : event.type === 'birthday' ? 'Birthday' : event.type === 'company_event' ? 'Event' : event.type}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/events" className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Calendar →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.light} p-3 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <stat.icon className={`${stat.text} w-6 h-6`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {filteredQuickActions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {filteredQuickActions.map((action) => (
                <Link key={action.label} href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
                  <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                    <action.icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center transition-colors">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Heart size={10} />
            Techsprout.ai
            <Heart size={10} />
          </p>
        </div>
      </div>
    </>
  );
}