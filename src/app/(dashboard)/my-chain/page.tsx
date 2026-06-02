'use client';

import { useState, useEffect } from 'react';
import { hierarchyService, ReportingChainItem } from '@/services/hierarchyService';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ChevronRight, User, Briefcase, Building2, Loader2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

export default function MyChainPage() {
  const { hasPermission } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [chain, setChain] = useState<ReportingChainItem[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // All authenticated users can see their reporting chain
      // No special permission needed
      setIsAuthorized(true);
    }
  }, [mounted]);

  useEffect(() => {
    if (isAuthorized) {
      const fetchChain = async () => {
        try {
          const res = await hierarchyService.getMyReportingChain();
          setChain(res.data || []);
          setCurrentEmployee(res.current);
        } catch (error) {
          console.error('Failed to fetch reporting chain:', error);
          toast.error('Failed to load reporting chain');
        } finally {
          setLoading(false);
        }
      };
      fetchChain();
    }
  }, [isAuthorized]);

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Reporting Chain</h2>
        <p className="text-sm text-slate-400 mt-1">Who I report to</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* Current Employee */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {currentEmployee?.name?.charAt(0) || 'U'}
            </div>
            <p className="font-semibold text-slate-800 mt-2">{currentEmployee?.name || 'You'}</p>
            <p className="text-xs text-slate-400">{currentEmployee?.designation || 'Current Position'}</p>
          </div>
        </div>

        {/* Reporting Chain */}
        {chain.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
            <p>You are at the top of the reporting hierarchy.</p>
            <p className="text-xs mt-1">No one to report to.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chain.map((manager, index) => (
              <div key={manager.id}>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white font-bold">
                      {manager.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{manager.name}</p>
                      <p className="text-sm text-slate-500">{manager.designation}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Briefcase size={11} />
                          {manager.position_label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index === 0 && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Direct Manager</span>
                  )}
                </div>
                {index < chain.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ChevronRight size={16} className="text-slate-300 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}