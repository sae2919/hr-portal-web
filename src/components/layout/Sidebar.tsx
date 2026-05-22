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
  DollarSign,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['admin', 'hr', 'manager'],
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
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Leaves',
    href: '/leaves',
    icon: Calendar,
    roles: ['admin', 'hr', 'manager', 'employee'],
  },
  {
    label: 'Payroll',
    href: '/payroll',
    icon: DollarSign,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['admin', 'hr'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filtered = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

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

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Bottom user hint */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            HR Portal v1.0
          </p>
        </div>
      )}
    </aside>
  );
}