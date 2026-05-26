'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { 
  Users, Clock, Calendar, IndianRupee, TrendingUp, 
  UserCheck, Building2, Loader2, Code2, Bug, Target, 
  BarChart3, Globe, User, Receipt
} from 'lucide-react';

export default function NonAdminWorkspacePage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('GENERAL');

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Redirect admin away immediately
    if (user?.role === 'admin') {
      router.replace('/dashboard');
      return;
    }

    api.get('/v1/workspace/stats')
      .then(res => {
        setStats(res.data);
        setActiveTab(res.data.department || 'GENERAL');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Workspace data load error:', err);
        setLoading(false);
      });
  }, [isAuthenticated, token, user, router]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  const userDept = stats?.department || 'GENERAL';
  const roleTier = stats?.role_tier || 'employee';

  return (
    <div className="space-y-6">
      {/* Workspace Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
            <p className="text-slate-300 text-sm mt-1">
              Department Unit: <span className="text-blue-400 font-semibold">{userDept}</span> ({roleTier})
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300 font-medium">
            Employee Workspace
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto select-none">
        {['TECH', 'SALES', 'MARKETING', 'SEO', 'OPERATIONS', 'GENERAL'].map((tab) => {
          const isNative = userDept === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-10 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab} Workspace {isNative && '•'}
            </button>
          );
        })}
      </div>

      {/* TECH */}
      {activeTab === 'TECH' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Active Developer Tasks</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">{stats?.tech_stats?.active_tasks_count || 0}</h4>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Code2 size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Open QA Bug Tickets</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">{stats?.tech_stats?.open_bugs_count || 0}</h4>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><Bug size={22} /></div>
          </div>
        </div>
      )}

      {/* SALES */}
      {activeTab === 'SALES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Team Closed Revenue</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">₹{Number(stats?.sales_stats?.monthly_revenue || 0).toLocaleString('en-IN')}</h4>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><IndianRupee size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Deals in Negotiation</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">{stats?.sales_stats?.pipeline_deals || 0}</h4>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600"><Target size={22} /></div>
          </div>
        </div>
      )}

      {/* MARKETING */}
      {activeTab === 'MARKETING' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Active Campaigns</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">{stats?.marketing_stats?.active_campaigns || 0}</h4>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600"><BarChart3 size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Conversion Yield</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">{stats?.marketing_stats?.conversion_yield || 0}%</h4>
            </div>
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600"><UserCheck size={22} /></div>
          </div>
        </div>
      )}

      {/* SEO */}
      {activeTab === 'SEO' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Target Keywords Indexed</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">Top 3 Rankings</h4>
            </div>
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600"><Globe size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Backlink Domain Health</p>
              <h4 className="text-2xl font-bold mt-1 text-slate-800">98% Secure</h4>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600"><TrendingUp size={22} /></div>
          </div>
        </div>
      )}

      {/* OPERATIONS */}
      {activeTab === 'OPERATIONS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400 text-sm">
          <Building2 className="mx-auto w-8 h-8 text-slate-300 mb-2" />
          Operations trackers and shift resource assets are synced completely.
        </div>
      )}

      {/* GENERAL */}
      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">My Logged Attendance</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.core_hr_stats?.present_today || 'Verified'}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl text-green-600"><Clock size={22} /></div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Approved Leave Days</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.core_hr_stats?.on_leave || 0} days</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl text-orange-600"><Calendar size={22} /></div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Company Active Headcount</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.core_hr_stats?.employees || 0}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users size={22} /></div>
          </div>
        </div>
      )}

      {/* Quick Actions Workspace */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 select-none">Quick Actions Workspace</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Action 1: Edit profile (Replaces Add Employee) */}
          <Link href="/profile/edit" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
              <User className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">Edit Profile</span>
          </Link>

          {/* Action 2: Standard personal attendance logging tracking link */}
          <Link href="/attendance" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
              <Clock className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">Attendance</span>
          </Link>

          {/* Action 3: Apply Leave */}
          <Link href="/leaves" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
              <Calendar className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">Apply Leave</span>
          </Link>

          {/* Action 4: My Payslips (Replaces Run Payroll) */}
          <Link href="/payroll" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group shadow-sm bg-white">
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
              <Receipt className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center">My Payslips</span>
          </Link>

        </div>
      </div>
    </div>
  );
}