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
import {
  Users, Clock, Calendar, IndianRupee, TrendingUp,
  UserCheck, Building2, Loader2, User, Receipt,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  ChevronRight, Briefcase, ShieldCheck,
  BarChart2, Quote, Cake, Gift, Sparkles, Heart,
  RefreshCw, PartyPopper,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  department: string;
  role_tier: string;
  designation?: string;
  manager_stats?: {
    dept_employee_count: number;
    dept_present_today: number;
    dept_on_leave: number;
    dept_pending_leave_approvals: number;
    dept_absent_today: number;
    dept_attendance_rate: number;
  };
  employee_stats?: {
    present_this_month: number;
    absent_this_month: number;
    approved_leaves: number;
    pending_leaves: number;
    latest_payslip_month: string | null;
    latest_payslip_net: number | null;
  };
}

const fallbackStats: WorkspaceStats = {
  department: 'Your Department',
  role_tier: 'employee',
  manager_stats: {
    dept_employee_count: 0, dept_present_today: 0, dept_on_leave: 0,
    dept_pending_leave_approvals: 0, dept_absent_today: 0, dept_attendance_rate: 0,
  },
  employee_stats: {
    present_this_month: 0, absent_this_month: 0, approved_leaves: 0,
    pending_leaves: 0, latest_payslip_month: null, latest_payslip_net: null,
  },
};

const fallbackQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function QuoteAndTodaySpecial({ dailyQuote, todaySpecial }: {
  dailyQuote: any;
  todaySpecial: { birthdays: any[]; anniversaries: any[] };
}) {
  const hasTodaySpecial = todaySpecial.birthdays.length > 0 || todaySpecial.anniversaries.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {dailyQuote && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Quote size={14} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" /> Daily Inspiration
            </span>
          </div>
          <p className="text-sm text-slate-700 italic leading-relaxed flex-1">"{dailyQuote.quote}"</p>
          {dailyQuote.author && <p className="text-xs text-amber-600 mt-3 font-medium">— {dailyQuote.author}</p>}
        </div>
      )}

      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border border-pink-200 shadow-sm flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
            <Cake size={14} className="text-pink-500" />
          </div>
          <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide flex items-center gap-1">
            <Sparkles size={11} className="text-pink-400" /> Today's Special
          </span>
        </div>
        {hasTodaySpecial ? (
          <div className="space-y-2 flex-1 overflow-y-auto max-h-40 pr-1">
            {todaySpecial.birthdays.map((b: any) => (
              <div key={b.id ?? b.name} className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
                <span className="text-lg">🎂</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.department || ''}</p>
                </div>
                <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full shrink-0">Birthday</span>
              </div>
            ))}
            {todaySpecial.anniversaries.map((a: any) => (
              <div key={a.id ?? a.name} className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
                <span className="text-lg">🎊</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                  <p className="text-xs text-slate-400">
                    {a.years_completed ? `${a.years_completed} yr${a.years_completed > 1 ? 's' : ''} · ` : ''}{a.department || ''}
                  </p>
                </div>
                <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full shrink-0">Anniversary</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <PartyPopper size={26} className="text-pink-200 mb-2" />
            <p className="text-xs text-slate-400">No birthdays or anniversaries today</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal'; sub?: string;
}) {
  const palette = {
    blue:   { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100' },
    red:    { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100' },
    purple: { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100' },
    teal:   { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-100' },
  }[color];

  return (
    <div className={`bg-white rounded-2xl p-5 border ${palette.border} shadow-sm flex items-start justify-between gap-4`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 shrink-0 ${palette.bg} rounded-xl flex items-center justify-center ${palette.text}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
      <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
        <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
      </div>
      <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">{label}</span>
    </Link>
  );
}

// ─── Manager / Team Lead Dashboard ───────────────────────────────────────────

function ManagerDashboard({ stats, userName, roleLabel, dailyQuote, todaySpecial }: {
  stats: WorkspaceStats; userName: string; roleLabel: string;
  dailyQuote: any; todaySpecial: { birthdays: any[]; anniversaries: any[] };
}) {
  const { user } = useAuthStore();
  const empId = user?.employee_id || user?.employee?.id;
  const ms = stats.manager_stats;
  const dept = stats.department || 'Your Department';
  const attendanceRate = ms?.dept_attendance_rate ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {userName} 👋</h2>
            <p className="text-slate-300 text-sm mt-1">
              Managing: <span className="text-blue-400 font-semibold">{dept}</span> Department
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 font-medium">
            <ShieldCheck size={14} className="text-blue-400" />
            {roleLabel}
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400">Today's Attendance Rate</span>
            <span className="text-xs font-semibold text-white">{attendanceRate}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
          </div>
        </div>
      </div>

      <QuoteAndTodaySpecial dailyQuote={dailyQuote} todaySpecial={todaySpecial} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Dept Employees"    value={ms?.dept_employee_count ?? 0}         icon={Users}       color="blue"   sub="Total headcount" />
        <StatCard label="Present Today"     value={ms?.dept_present_today ?? 0}           icon={UserCheck}   color="green"  sub={`of ${ms?.dept_employee_count ?? 0} employees`} />
        <StatCard label="On Leave Today"    value={ms?.dept_on_leave ?? 0}                icon={Calendar}    color="orange" />
        <StatCard label="Absent Today"      value={ms?.dept_absent_today ?? 0}            icon={XCircle}     color="red" />
        <StatCard label="Pending Approvals" value={ms?.dept_pending_leave_approvals ?? 0} icon={AlertCircle} color="purple" sub="Leave requests" />
        <StatCard label="Attendance Rate"   value={`${attendanceRate}%`}                  icon={TrendingUp}  color="teal"   sub="Today" />
      </div>

      {(ms?.dept_pending_leave_approvals ?? 0) > 0 && (
        <Link href="/leaves" className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 hover:bg-amber-100 transition-colors group">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {ms?.dept_pending_leave_approvals} leave request{(ms?.dept_pending_leave_approvals ?? 0) > 1 ? 's' : ''} waiting for your approval
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Review and approve or reject</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/employees"    icon={Users}    label="Team Members" />
          <QuickAction href="/attendance"   icon={Clock}    label="Attendance" />
          <QuickAction href="/leaves"       icon={Calendar} label="Leave Requests" />
          <QuickAction href={empId ? `/employees/${empId}` : "/profile/edit"} icon={User}     label="My Profile" />
        </div>
      </div>
    </div>
  );
}

// ─── Sales Manager Dashboard ──────────────────────────────────────────────────

function SalesManagerDashboard({ stats, userName, dailyQuote, todaySpecial }: {
  stats: WorkspaceStats; userName: string;
  dailyQuote: any; todaySpecial: { birthdays: any[]; anniversaries: any[] };
}) {
  const ms = stats.manager_stats;
  const dept = stats.department || 'Sales';
  const attendanceRate = ms?.dept_attendance_rate ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {userName} 👋</h2>
            <p className="text-blue-200 text-sm mt-1">Sales Team: <span className="text-white font-semibold">{dept}</span></p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-blue-100 font-medium">
            <BarChart2 size={14} className="text-blue-300" /> Sales Manager
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-blue-300">Team Attendance Rate</span>
            <span className="text-xs font-semibold text-white">{attendanceRate}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-300 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
          </div>
        </div>
      </div>

      <QuoteAndTodaySpecial dailyQuote={dailyQuote} todaySpecial={todaySpecial} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Team Size"         value={ms?.dept_employee_count ?? 0}         icon={Users}       color="blue"   sub="Active members" />
        <StatCard label="Present Today"     value={ms?.dept_present_today ?? 0}           icon={UserCheck}   color="green"  sub={`of ${ms?.dept_employee_count ?? 0}`} />
        <StatCard label="On Leave"          value={ms?.dept_on_leave ?? 0}                icon={Calendar}    color="orange" />
        <StatCard label="Absent Today"      value={ms?.dept_absent_today ?? 0}            icon={XCircle}     color="red" />
        <StatCard label="Pending Approvals" value={ms?.dept_pending_leave_approvals ?? 0} icon={AlertCircle} color="purple" sub="Leave requests" />
        <StatCard label="Attendance Rate"   value={`${attendanceRate}%`}                  icon={TrendingUp}  color="teal"   sub="Today" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/employees"   icon={Users}     label="Team Members" />
          <QuickAction href="/attendance"  icon={Clock}     label="Attendance" />
          <QuickAction href="/leaves"      icon={Calendar}  label="Leave Requests" />
          <QuickAction href="/recruitment" icon={Briefcase} label="Recruitment" />
        </div>
      </div>
    </div>
  );
}

// ─── Employee Dashboard ───────────────────────────────────────────────────────

function EmployeeDashboard({ stats, userName, dailyQuote, todaySpecial }: {
  stats: WorkspaceStats; userName: string;
  dailyQuote: any; todaySpecial: { birthdays: any[]; anniversaries: any[] };
}) {
  const { user } = useAuthStore();
  const empId = user?.employee_id || user?.employee?.id;
  const es = stats.employee_stats;
  const dept = stats.department || 'General';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {userName} 👋</h2>
            <p className="text-slate-300 text-sm mt-1">Department: <span className="text-blue-400 font-semibold">{dept}</span></p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 font-medium">
            <Briefcase size={14} className="text-blue-400" /> Employee
          </div>
        </div>
      </div>

      <QuoteAndTodaySpecial dailyQuote={dailyQuote} todaySpecial={todaySpecial} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Present This Month" value={es?.present_this_month ?? 0} icon={CheckCircle2} color="green"  sub="Working days" />
        <StatCard label="Absent This Month"  value={es?.absent_this_month ?? 0}  icon={XCircle}      color="red" />
        <StatCard label="Approved Leaves"    value={es?.approved_leaves ?? 0}    icon={Calendar}     color="blue"   sub="This year" />
        <StatCard label="Pending Leaves"     value={es?.pending_leaves ?? 0}     icon={AlertCircle}  color="orange" sub="Awaiting approval" />
        {es?.latest_payslip_month && (
          <StatCard
            label="Last Month Salary"
            value={`₹${Number(es.latest_payslip_net ?? 0).toLocaleString('en-IN')}`}
            icon={IndianRupee} color="teal" sub={es.latest_payslip_month}
          />
        )}
        <StatCard
          label="Leave Balance"
          value={`${Math.max(0, 12 - (es?.approved_leaves ?? 0))} days`}
          icon={BarChart3} color="purple" sub="Remaining"
        />
      </div>

      {(es?.pending_leaves ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <AlertCircle size={18} className="text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800">
            You have <span className="font-semibold">{es?.pending_leaves} leave request{(es?.pending_leaves ?? 0) > 1 ? 's' : ''}</span> pending manager approval.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href={empId ? `/employees/${empId}` : "/profile/edit"} icon={User}     label="My Profile" />
          <QuickAction href="/attendance"   icon={Clock}    label="Attendance" />
          <QuickAction href="/leaves"       icon={Calendar} label="Apply Leave" />
          <QuickAction href="/payroll"      icon={Receipt}  label="My Payslips" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<any>(null);
  const [todaySpecial, setTodaySpecial] = useState<{ birthdays: any[]; anniversaries: any[] }>({
    birthdays: [], anniversaries: [],
  });

  // Resolve tier from user object — same logic as login redirect and sidebar
  const tier = resolveRoleTier(user);

  const fetchWorkspaceData = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    setApiError(false);
    try {
      const statsRes = await api.get('/workspace/stats', { timeout: 10000 });
      setStats(statsRes.data);
    } catch {
      setApiError(true);
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  const loadDailyQuote = useCallback(async () => {
    try {
      const res = await quoteService.getRandomQuote();
      setDailyQuote(res.success && res.data
        ? res.data
        : fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]);
    } catch {
      setDailyQuote(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]);
    }
  }, []);

  const loadTodaySpecial = useCallback(async () => {
    try {
      const res = await eventService.getTodaySpecial();
      if (res.success && res.data) {
        setTodaySpecial({
          birthdays: res.data.birthdays || [],
          anniversaries: res.data.anniversaries || [],
        });
      }
    } catch {
      setTodaySpecial({ birthdays: [], anniversaries: [] });
    }
  }, []);

  const handleRetry = () => {
    fetchWorkspaceData();
    loadDailyQuote();
    loadTodaySpecial();
  };

  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;
    // Admin/HR should not be here
    if (tier === 'admin' || tier === 'hr') {
      router.replace('/dashboard');
      return;
    }
    fetchWorkspaceData();
    loadDailyQuote();
    loadTodaySpecial();
  }, [isAuthenticated, token, tier, user, router, fetchWorkspaceData, loadDailyQuote, loadTodaySpecial]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const currentStats = stats || fallbackStats;

  // Use frontend tier (resolveRoleTier) as primary,
  // fall back to API role_tier if frontend can't determine it
  const effectiveTier = tier !== 'employee' ? tier : (currentStats.role_tier ?? 'employee');

  const isManager  = effectiveTier === 'manager';
  const isTeamLead = effectiveTier === 'team_lead';
  const isSalesMgr = effectiveTier === 'sales_manager';

  // Role label shown in dashboard header
  const roleLabel = {
    manager:       'Department Manager',
    team_lead:     'Team Lead',
    sales_manager: 'Sales Manager',
  }[effectiveTier] ?? 'Employee';

  return (
    <>
      <BirthdayNotification />

      {apiError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Unable to connect to server</p>
              <p className="text-xs text-amber-600">Showing cached data. Some information may be outdated.</p>
            </div>
          </div>
          <button onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {isSalesMgr && (
        <SalesManagerDashboard
          stats={currentStats} userName={firstName}
          dailyQuote={dailyQuote} todaySpecial={todaySpecial}
        />
      )}
      {(isManager || isTeamLead) && (
        <ManagerDashboard
          stats={currentStats} userName={firstName}
          roleLabel={roleLabel}
          dailyQuote={dailyQuote} todaySpecial={todaySpecial}
        />
      )}
      {!isManager && !isTeamLead && !isSalesMgr && (
        <EmployeeDashboard
          stats={currentStats} userName={firstName}
          dailyQuote={dailyQuote} todaySpecial={todaySpecial}
        />
      )}
    </>
  );
}