'use client';

import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, User, Settings, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

function getPageTitle(pathname: string, role?: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/workspace':  'Dashboard',
    '/employees':  'Employees',
    '/departments': 'Departments',
    '/designations': 'Designations',
    '/attendance': 'Attendance',
    '/leaves':     'Leave Management',
    '/payroll':    'Payroll',
    '/recruitment': 'Recruitment',
    '/settings':   'Settings',
  };

  for (const key of Object.keys(map)) {
    if (pathname.startsWith(key)) return map[key];
  }

  // Fallback: role-aware portal name
  if (!role) return 'Employee Portal';
  if (['admin', 'hr'].includes(role))                       return 'HR Portal';
  if (role === 'manager')                                    return 'Manager Portal';
  if (role === 'team_lead')                                  return 'Team Lead Portal';
  if (role === 'sales_manager')                              return 'Sales Manager Portal';
  return 'Employee Portal';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const { user } = useAuthStore();
  const { mutate: logout, isPending } = useLogout();
  const pathname = usePathname();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {getPageTitle(pathname, user?.role)}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">

        {/* Notification Bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-lg hover:bg-slate-100 transition-colors outline-none">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-700 leading-none">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">
                  {user?.role ?? 'employee'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                {user?.email}
              </p>
              <Badge variant="secondary" className="mt-1.5 text-xs capitalize">
                {user?.role}
              </Badge>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer">
              <User size={14} className="mr-2" />
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <Settings size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => logout()}
              disabled={isPending}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              {isPending ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <LogOut size={14} className="mr-2" />
              )}
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}