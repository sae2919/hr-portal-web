'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link'; 
import { useRouter } from 'next/navigation'; 
import api from '@/lib/api'; 
import { useAuthStore } from '@/store/authStore';

import {
  Users,
  Clock,
  Calendar,
  IndianRupee, 
  TrendingUp,
  UserCheck,
  AlertCircle,
  Building2,
  Loader2, 
} from 'lucide-react';

const quickActions = [
  { label: 'Add Employee', icon: Users, href: '/employees/create' },
  { label: 'Mark Attendance', icon: Clock, href: '/attendance' },
  { label: 'Apply Leave', icon: Calendar, href: '/leaves' },
  { label: 'Run Payroll', icon: TrendingUp, href: '/payroll' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      // ✅ FIX 1: Correct endpoint
      const res = await api.get('/v1/dashboard/stats');
      setStats(res.data);
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && token === null) {
      router.push('/login');
      return;
    }

    // ✅ FIX 2: Guard from store directly, don't rely on API for role check
    if (user?.role !== 'admin') {
      router.replace('/workspace');
      return;
    }

    loadStats();
  }, [loadStats, isAuthenticated, user, router, token]);

  if (loading || !stats) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-xs text-slate-400 font-medium select-none animate-pulse">
          Synchronizing secure admin metrics...
        </p>
      </div>
    );
  }

  const dashboardStats = [
    { label: 'Total Employees', value: stats.employees ?? 0, icon: Users, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Present Today', value: stats.present_today ?? 0, icon: UserCheck, light: 'bg-green-50', text: 'text-green-600' },
    { label: 'On Leave', value: stats.on_leave ?? 0, icon: Calendar, light: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Pending Leaves', value: stats.pending_leaves ?? 0, icon: AlertCircle, light: 'bg-red-50', text: 'text-red-600' },
    { label: 'Departments', value: stats.departments ?? 0, icon: Building2, light: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'This Month Payroll', value: `₹${Number(stats.monthly_payroll || 0).toLocaleString('en-IN')}`, icon: IndianRupee, light: 'bg-teal-50', text: 'text-teal-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-sm">
        <h2 className="text-xl font-bold">Welcome back, Admin {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-blue-100 text-sm mt-1">Enterprise management command parameters synchronized completely.</p>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize font-medium">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            {user?.role || 'Admin'} Account
          </span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.light} p-3 rounded-xl flex-shrink-0`}>
                <stat.icon className={`${stat.text} w-6 h-6`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 select-none">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
              <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                <action.icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}