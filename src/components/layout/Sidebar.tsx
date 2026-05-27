'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  Calendar,
  IndianRupee,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['admin', 'hr', 'manager', 'team_lead', 'sales_manager'],
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Designations',
    href: '/designations',
    icon: Briefcase,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: Clock,
    roles: ['admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Leaves',
    href: '/leaves',
    icon: Calendar,
    roles: ['admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Payroll',
    href: '/payroll',
    icon: IndianRupee,
    roles: ['admin', 'hr', 'employee'],
  },
  {
    label: 'Recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['admin', 'hr', 'sales_manager'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

const WORKSPACE_ROLES = ['manager', 'team_lead', 'sales_manager', 'employee'];

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  // Defer role resolution to client only to avoid SSR/client mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const role = userRole?.toLowerCase();
  const isWorkspaceRole = mounted && WORKSPACE_ROLES.includes(role);

  const filtered = navItems.filter((item) => item.roles.includes(role));

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-slate-700/50 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white">HR Portal</p>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => {
          const href =
            item.label === 'Dashboard' && isWorkspaceRole
              ? '/workspace'
              : item.href;

          const isActive =
            pathname === href ||
            (href !== '/dashboard' && href !== '/workspace' && pathname.startsWith(href)) ||
            (item.label === 'Dashboard' && (pathname === '/workspace' || pathname === '/dashboard'));

          return (
            <Link
              key={item.href}
              href={href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* User profile footer */}
      <div className={cn('border-t border-slate-700/50', collapsed ? 'p-2' : 'p-3')}>
        <Link
          href="/profile/edit"
          title={collapsed ? 'Edit Profile' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-800 transition-colors group',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 capitalize truncate">{role}</p>
            </div>
          )}
          {!collapsed && (
            <UserCircle size={14} className="text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
          )}
        </Link>
        {!collapsed && (
          <p className="text-xs text-slate-600 text-center mt-2">HR Portal v1.0</p>
        )}
      </div>
    </aside>
  );
}