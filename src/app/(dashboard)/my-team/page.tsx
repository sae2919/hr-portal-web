'use client';

import { useState, useEffect } from 'react';
import { hierarchyService } from '@/services/hierarchyService';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { 
  Users, Search, Briefcase, Building2, ChevronRight, 
  UserCheck, Calendar, Loader2, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  employee_code: string;
  phone?: string;
  designation?: { id: number; name: string };
  department?: { id: number; name: string };
  joining_date: string;
  status: string;
  position_level: string;
}

const positionBadges: Record<string, string> = {
  c_level: 'bg-purple-100 text-purple-700',
  vp: 'bg-indigo-100 text-indigo-700',
  director: 'bg-blue-100 text-blue-700',
  senior_manager: 'bg-cyan-100 text-cyan-700',
  manager: 'bg-emerald-100 text-emerald-700',
  team_lead: 'bg-amber-100 text-amber-700',
  staff: 'bg-slate-100 text-slate-600',
  intern: 'bg-slate-50 text-slate-400',
};

export default function MyTeamPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      // Check user role directly
      const role = user.role?.toLowerCase();
      const allowedRoles = ['admin', 'hr', 'manager', 'team_lead'];
      
      if (allowedRoles.includes(role)) {
        setIsAuthorized(true);
      } else {
        console.log('Redirecting to dashboard - Role:', role);
        router.push('/dashboard');
      }
    }
  }, [mounted, user, router]);

  useEffect(() => {
    if (isAuthorized) {
      const fetchTeam = async () => {
        try {
          const res = await hierarchyService.getMyTeam();
          const members = res.data || [];
          setTeamMembers(members);
          setStats(res.stats || { total: members.length, active: 0, onLeave: 0 });
        } catch (error) {
          console.error('Failed to fetch team:', error);
          toast.error('Failed to load team members');
        } finally {
          setLoading(false);
        }
      };
      fetchTeam();
    }
  }, [isAuthorized]);

  const filteredMembers = teamMembers.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const searchLower = search.toLowerCase();
    const designationName = typeof member.designation === 'string'
      ? member.designation
      : (member.designation?.name || '');
    return search === '' || 
      fullName.includes(searchLower) ||
      member.employee_code.toLowerCase().includes(searchLower) ||
      designationName.toLowerCase().includes(searchLower);
  });

  // Show loading while checking authorization
  if (!mounted || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Team</h2>
        <p className="text-sm text-slate-400 mt-1">Employees reporting to you</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Team Members</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Members</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <UserCheck size={18} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">On Leave</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.onLeave}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Calendar size={18} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by name, employee code, or designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">No team members found</p>
            {search && (
              <button onClick={() => setSearch('')} className="text-blue-600 text-sm mt-2">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMembers.map((member) => (
              <Link 
                key={member.id} 
                href={`/employees/${member.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800">
                        {member.first_name} {member.last_name}
                      </p>
                      <Badge className={`text-xs ${positionBadges[member.position_level] || positionBadges.staff} border-0`}>
                        {typeof member.designation === 'string' ? member.designation : (member.designation?.name || 'N/A')}
                      </Badge>
                      <Badge className={`text-xs ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0`}>
                        {member.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {typeof member.department === 'string' ? member.department : (member.department?.name || 'N/A')}
                      </span>
                      <span className="font-mono">{member.employee_code}</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition flex-shrink-0 ml-4" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}