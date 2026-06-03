'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Briefcase, Clock,
  Calendar, IndianRupee, UserPlus, Settings, ChevronLeft,
  ChevronRight, UserCircle, Network, Cake, Quote, UserCheck,
  TrendingUp,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { resolveRoleTier } from '@/hooks/useAuth';
import api from '@/lib/api';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin','super admin','admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['super_admin','super admin', 'admin', 'hr', 'manager', 'team_lead', 'sales_manager'],
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['super_admin','super admin', 'admin', 'hr'],
  },
  {
    label: 'Designations',
    href: '/designations',
    icon: Briefcase,
    roles: ['super_admin','super admin', 'admin', 'hr'],
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: Clock,
    roles: ['super_admin','super admin', 'admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Leaves',
    href: '/leaves',
    icon: Calendar,
    roles: ['super_admin', 'admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Payroll',
    href: '/payroll',
    icon: IndianRupee,
    roles: ['super_admin','super admin', 'admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Appraisals',
    href: '/salary-revisions',
    icon: TrendingUp,
    roles: ['super_admin','super admin', 'admin', 'hr', 'manager', 'team_lead', 'sales_manager', 'employee'],
  },
  {
    label: 'Organization',
    href: '/organization',
    icon: Network,
    roles: ['super_admin','super admin', 'admin', 'hr', 'manager', 'team_lead', 'employee'],
  },
  {
    label: 'Onboarding',
    href: '/onboarding',
    icon: UserCheck,
    roles: ['super_admin', 'admin', 'hr', 'manager'],
  },
  {
    label: 'Events',
    href: '/events',
    icon: Cake,
    roles: ['super_admin', 'admin', 'hr', 'manager', 'team_lead', 'employee'],
  },
  {
    label: 'Quotes',
    href: '/quotes',
    icon: Quote,
    roles: ['super_admin','super admin', 'admin', 'hr'],
  },
  {
    label: 'Recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['super_admin', 'admin', 'hr', 'sales_manager'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['super_admin','super admin', 'admin'],
  },
];

const WORKSPACE_ROLES = ['manager', 'team_lead', 'sales_manager', 'employee'];

const ROLE_LABELS: Record<string, string> = {
  admin:         'Admin',
  super_admin:   'Super Admin',
  hr:            'HR',
  hr_manager:    'HR Manager',
  manager:       'Manager',
  team_lead:     'Team Lead',
  sales_manager: 'Sales Manager',
  employee:      'Employee',
};

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [branding, setBranding] = useState({
    name: 'Techsprout',
    logo: '/logo.png',
  });

  useEffect(() => {
    // 1. Instantly load from localStorage if available
    const cachedName = localStorage.getItem('company_name');
    const cachedLogo = localStorage.getItem('company_logo');
    if (cachedName || cachedLogo) {
      setBranding({
        name: cachedName || 'Techsprout',
        logo: cachedLogo || '/logo.png',
      });
    }

    // 2. Fetch fresh settings in background
    (async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data;
        const name = data.company_name || 'Techsprout';
        const logo = data.company_logo || '/logo.png';
        
        setBranding({ name, logo });
        localStorage.setItem('company_name', name);
        localStorage.setItem('company_logo', logo);
      } catch (err) {
        console.error('Failed to load branding in Sidebar:', err);
      }
    })();
  }, []);

  // resolveRoleTier checks Spatie roles[] → role column → designation — single source of truth
  const tier = mounted
    ? resolveRoleTier(user)
    : (userRole?.toLowerCase().replace(/[\s-]/g, '_') || 'employee');

  const isWorkspaceRole = mounted && WORKSPACE_ROLES.includes(tier);
  const filtered = navItems.filter((item) => item.roles.includes(tier));
  const roleLabel = ROLE_LABELS[tier] ?? tier;

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
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
          'flex items-center gap-3 h-16 px-4 border-b border-slate-700/50',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <img
          src={branding.logo}
          alt={branding.name}
          className={collapsed ? 'h-10 w-10 object-contain' : 'h-10 w-10 object-contain rounded-lg'}
        />

        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {branding.name}
            </p>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              HRMS
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => {
          const href =
            item.label === 'Dashboard' && isWorkspaceRole ? '/workspace' : item.href;

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
        <p className="text-xs font-semibold text-white truncate">
          {user?.name || 'User'}
        </p>
        <p className="text-xs text-slate-400 capitalize truncate">
          {roleLabel}
        </p>
      </div>
    )}

    {!collapsed && (
      <UserCircle
        size={14}
        className="text-slate-500 group-hover:text-slate-300 flex-shrink-0"
      />
    )}
  </Link>

  {!collapsed && (
    <p className="text-[10px] text-slate-600 text-center mt-2 truncate px-2">
      {branding.name} HRMS v1.0
    </p>
  )}
</div>
    </aside>
  );
}