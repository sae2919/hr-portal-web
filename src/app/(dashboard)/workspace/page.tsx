'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Users, Clock, Calendar, IndianRupee, TrendingUp,
  UserCheck, Building2, Loader2, User, Receipt,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  ArrowUpRight, ChevronRight, Briefcase, ShieldCheck,
  Star, BarChart2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  department: string;
  role_tier: 'manager' | 'team_lead' | 'sales_manager' | 'employee' | string;

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

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
  sub?: string;
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

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white"
    >
      <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
        <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
      </div>
      <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">{label}</span>
    </Link>
  );
}

// ─── Manager / TeamLead Dashboard ────────────────────────────────────────────

function ManagerDashboard({
  stats, userName, roleLabel, accentColor,
}: {
  stats: WorkspaceStats;
  userName: string;
  roleLabel: string;
  accentColor: string;
}) {
  const ms = stats.manager_stats;
  const dept = stats.department || 'Your Department';
  const attendanceRate = ms?.dept_attendance_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
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

        {/* Attendance progress bar */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400">Today's Attendance Rate</span>
            <span className="text-xs font-semibold text-white">{attendanceRate}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Dept Employees"    value={ms?.dept_employee_count ?? 0}         icon={Users}      color="blue"   sub="Total headcount" />
        <StatCard label="Present Today"     value={ms?.dept_present_today ?? 0}           icon={UserCheck}  color="green"  sub={`of ${ms?.dept_employee_count ?? 0} employees`} />
        <StatCard label="On Leave Today"    value={ms?.dept_on_leave ?? 0}                icon={Calendar}   color="orange" />
        <StatCard label="Absent Today"      value={ms?.dept_absent_today ?? 0}            icon={XCircle}    color="red" />
        <StatCard label="Pending Approvals" value={ms?.dept_pending_leave_approvals ?? 0} icon={AlertCircle} color="purple" sub="Leave requests" />
        <StatCard label="Attendance Rate"   value={`${attendanceRate}%`}                  icon={TrendingUp} color="teal"   sub="Today" />
      </div>

      {/* Pending leave approvals CTA */}
      {(ms?.dept_pending_leave_approvals ?? 0) > 0 && (
        <Link
          href="/leaves"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 hover:bg-amber-100 transition-colors group"
        >
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/employees"   icon={Users}    label="Team Members" />
          <QuickAction href="/attendance"  icon={Clock}    label="Attendance" />
          <QuickAction href="/leaves"      icon={Calendar} label="Leave Requests" />
          <QuickAction href="/profile/edit" icon={User}   label="My Profile" />
        </div>
      </div>
    </div>
  );
}

// ─── SalesManager Dashboard ───────────────────────────────────────────────────

function SalesManagerDashboard({ stats, userName }: { stats: WorkspaceStats; userName: string }) {
  const ms = stats.manager_stats;
  const dept = stats.department || 'Sales';
  const attendanceRate = ms?.dept_attendance_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {userName} 👋</h2>
            <p className="text-blue-200 text-sm mt-1">
              Sales Team: <span className="text-white font-semibold">{dept}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-blue-100 font-medium">
            <BarChart2 size={14} className="text-blue-300" />
            Sales Manager
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-blue-300">Team Attendance Rate</span>
            <span className="text-xs font-semibold text-white">{attendanceRate}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-300 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Team Size"         value={ms?.dept_employee_count ?? 0}         icon={Users}      color="blue"   sub="Active members" />
        <StatCard label="Present Today"     value={ms?.dept_present_today ?? 0}           icon={UserCheck}  color="green"  sub={`of ${ms?.dept_employee_count ?? 0}`} />
        <StatCard label="On Leave"          value={ms?.dept_on_leave ?? 0}                icon={Calendar}   color="orange" />
        <StatCard label="Absent Today"      value={ms?.dept_absent_today ?? 0}            icon={XCircle}    color="red" />
        <StatCard label="Pending Approvals" value={ms?.dept_pending_leave_approvals ?? 0} icon={AlertCircle} color="purple" sub="Leave requests" />
        <StatCard label="Attendance Rate"   value={`${attendanceRate}%`}                  icon={TrendingUp} color="teal"   sub="Today" />
      </div>

      {(ms?.dept_pending_leave_approvals ?? 0) > 0 && (
        <Link
          href="/leaves"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 hover:bg-amber-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {ms?.dept_pending_leave_approvals} leave request{(ms?.dept_pending_leave_approvals ?? 0) > 1 ? 's' : ''} pending approval
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Review and approve or reject</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/employees"    icon={Users}      label="Team Members" />
          <QuickAction href="/attendance"   icon={Clock}      label="Attendance" />
          <QuickAction href="/leaves"       icon={Calendar}   label="Leave Requests" />
          <QuickAction href="/recruitment"  icon={Briefcase}  label="Recruitment" />
        </div>
      </div>
    </div>
  );
}

// ─── Employee Dashboard ───────────────────────────────────────────────────────

function EmployeeDashboard({ stats, userName }: { stats: WorkspaceStats; userName: string }) {
  const es = stats.employee_stats;
  const dept = stats.department || 'General';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {userName} 👋</h2>
            <p className="text-slate-300 text-sm mt-1">
              Department: <span className="text-blue-400 font-semibold">{dept}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 font-medium">
            <Briefcase size={14} className="text-blue-400" />
            Employee
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Present This Month" value={es?.present_this_month ?? 0}  icon={CheckCircle2} color="green"  sub="Working days" />
        <StatCard label="Absent This Month"  value={es?.absent_this_month ?? 0}   icon={XCircle}      color="red" />
        <StatCard label="Approved Leaves"    value={es?.approved_leaves ?? 0}     icon={Calendar}     color="blue"   sub="This year" />
        <StatCard label="Pending Leaves"     value={es?.pending_leaves ?? 0}      icon={AlertCircle}  color="orange" sub="Awaiting approval" />
        {es?.latest_payslip_month && (
          <StatCard
            label="Last month salary"
            value={`₹${Number(es.latest_payslip_net ?? 0).toLocaleString('en-IN')}`}
            icon={IndianRupee}
            color="teal"
            sub={es.latest_payslip_month}
          />
        )}
        <StatCard
          label="Leave Balance"
          value={`${Math.max(0, 12 - (es?.approved_leaves ?? 0))} days`}
          icon={BarChart3}
          color="purple"
          sub="Remaining"
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/profile/edit" icon={User}      label="Edit Profile" />
          <QuickAction href="/attendance"   icon={Clock}     label="Attendance" />
          <QuickAction href="/leaves"       icon={Calendar}  label="Apply Leave" />
          <QuickAction href="/payroll"      icon={Receipt}   label="My Payslips" />
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
  const [error, setError] = useState(false);

  const userRole = user?.role ?? '';

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Admin & HR belong on the main admin dashboard
    if (userRole === 'admin' || userRole === 'hr') {
      router.replace('/dashboard');
      return;
    }

    api.get('/v1/workspace/stats')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isAuthenticated, token, userRole, router]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center gap-3 text-slate-400">
        <XCircle size={32} />
        <p className="text-sm">Could not load workspace data. Please refresh.</p>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // ── Role-based dashboard routing ──
  const isManager    = stats.role_tier === 'manager'      || userRole === 'manager';
  const isTeamLead   = stats.role_tier === 'team_lead'    || userRole === 'team_lead';
  const isSalesMgr   = stats.role_tier === 'sales_manager'|| userRole === 'sales_manager';

  if (isSalesMgr) {
    return <SalesManagerDashboard stats={stats} userName={firstName} />;
  }

  if (isManager || isTeamLead) {
    return (
      <ManagerDashboard
        stats={stats}
        userName={firstName}
        roleLabel={isTeamLead ? 'Team Lead' : 'Department Manager'}
        accentColor={isTeamLead ? 'emerald' : 'blue'}
      />
    );
  }

  return <EmployeeDashboard stats={stats} userName={firstName} />;
}