'use client';
import { useAuthStore } from '@/store/authStore';
import { Users, Clock, Calendar, DollarSign, TrendingUp, UserCheck, AlertCircle, Building2 } from 'lucide-react';

const stats = [
  { label: 'Total Employees', value: '0', icon: Users, light: 'bg-blue-50', text: 'text-blue-600' },
  { label: 'Present Today', value: '0', icon: UserCheck, light: 'bg-green-50', text: 'text-green-600' },
  { label: 'On Leave', value: '0', icon: Calendar, light: 'bg-orange-50', text: 'text-orange-600' },
  { label: 'Pending Leaves', value: '0', icon: AlertCircle, light: 'bg-red-50', text: 'text-red-600' },
  { label: 'Departments', value: '0', icon: Building2, light: 'bg-purple-50', text: 'text-purple-600' },
  { label: 'This Month Payroll', value: '0', icon: DollarSign, light: 'bg-teal-50', text: 'text-teal-600' },
];

const quickActions = [
  { label: 'Add Employee', icon: Users, href: '/employees/create' },
  { label: 'Mark Attendance', icon: Clock, href: '/attendance' },
  { label: 'Apply Leave', icon: Calendar, href: '/leaves/apply' },
  { label: 'Run Payroll', icon: TrendingUp, href: '/payroll' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  return (
    <div className='space-y-6'>
      <div className='bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white'>
        <h2 className='text-xl font-bold'>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
        <p className='text-blue-100 text-sm mt-1'>Here is what is happening in your organization today.</p>
        <div className='mt-3'>
          <span className='inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize'>
            <span className='w-1.5 h-1.5 bg-green-400 rounded-full' />
            {user?.role} Account
          </span>
        </div>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {stats.map((stat) => (
          <div key={stat.label} className='bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-500'>{stat.label}</p>
                <p className='text-2xl font-bold text-slate-800 mt-1'>{stat.value}</p>
              </div>
              <div className={stat.light + ' p-3 rounded-xl'}>
                <stat.icon className={stat.text + ' w-6 h-6'} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className='bg-white rounded-xl border border-slate-100 shadow-sm p-5'>
        <h3 className='text-sm font-semibold text-slate-700 mb-4'>Quick Actions</h3>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {quickActions.map((action) => (
            <a key={action.label} href={action.href} className='flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group'>
              <div className='w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors'>
                <action.icon className='w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors' />
              </div>
              <span className='text-xs font-medium text-slate-600 group-hover:text-blue-600 text-center transition-colors'>{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
