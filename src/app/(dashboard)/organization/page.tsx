'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { 
  Network, Users, GitBranch, BarChart3, 
  Building2, Briefcase, UserCheck, Loader2, Eye
} from 'lucide-react';
import OrgChart from '@/components/hierarchy/OrgChart';
import MyTeam from '@/components/hierarchy/MyTeam';
import ReportingChain from '@/components/hierarchy/ReportingChain';
import { toast } from 'sonner';

export default function OrganizationPage() {
  const { user, hasPermission } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'team' | 'chain'>('chart');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      // All authenticated users can access the organization page
      setIsAuthorized(true);
    }
  }, [mounted, user]);

  // Get user role for tab permissions
  const role = user?.role?.toLowerCase();
  
  // Permission definitions
  const canEditOrgChart = ['admin', 'hr'].includes(role || '');
  const canViewOrgChart = true; // Everyone can VIEW organization chart
  const canEditTeam = ['admin', 'hr', 'manager', 'team_lead'].includes(role || '');
  const canViewTeam = true; // Everyone can VIEW team structure
  const canViewChain = true; // Everyone can see their reporting chain

  // Set default tab based on role
  useEffect(() => {
    if (mounted && user) {
      if (canViewOrgChart) {
        setActiveTab('chart');
      } else if (canViewTeam) {
        setActiveTab('team');
      } else {
        setActiveTab('chain');
      }
    }
  }, [mounted, user, canViewOrgChart, canViewTeam]);

  const tabs = [
    { 
      id: 'chart', 
      label: 'Organization Chart', 
      icon: Network, 
      visible: canViewOrgChart,
      editable: canEditOrgChart,
      description: 'View complete company hierarchy'
    },
    { 
      id: 'team', 
      label: 'My Team', 
      icon: Users, 
      visible: canViewTeam,
      editable: canEditTeam,
      description: 'View your team members'
    },
    { 
      id: 'chain', 
      label: 'My Reporting Chain', 
      icon: GitBranch, 
      visible: canViewChain,
      editable: false,
      description: 'Who you report to'
    },
  ];

  const visibleTabs = tabs.filter(tab => tab.visible);

  if (!mounted || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organization</h1>
          <p className="text-sm text-slate-400 mt-1">View organization structure and reporting hierarchy</p>
        </div>
        {/* Role indicator badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            Role: {role?.replace('_', ' ') || 'User'}
          </span>
          {!canEditOrgChart && !canEditTeam && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
              <Eye size={12} />
              View Only
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="border-b border-slate-200">
          <nav className="flex gap-1 flex-wrap" aria-label="Tabs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all
                    ${isActive 
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }
                  `}
                  title={tab.description}
                >
                  <Icon size={16} />
                  {tab.label}
                  {!tab.editable && (
                    <span className="text-xs ml-1 text-slate-400">(view only)</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'chart' && canViewOrgChart && (
          <div className="space-y-4">
            {!canEditOrgChart && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                <Eye size={16} />
                You are in view-only mode. Contact HR/Admin for any organizational changes.
              </div>
            )}
            <OrgChart isEditable={canEditOrgChart} />
          </div>
        )}
        {activeTab === 'team' && canViewTeam && (
          <div className="space-y-4">
            {!canEditTeam && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                <Eye size={16} />
                You are in view-only mode. Only HR/Admin and Managers can edit team structure.
              </div>
            )}
            <MyTeam isEditable={canEditTeam} />
          </div>
        )}
        {activeTab === 'chain' && canViewChain && (
          <ReportingChain />
        )}
      </div>
    </div>
  );
}