'use client';

import { useState, useEffect } from 'react';
import { hierarchyService, ReportingChainItem } from '@/services/hierarchyService';
import { useAuthStore } from '@/store/authStore';
import { ChevronRight, Briefcase, Loader2, GitBranch, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportingChain() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [chain, setChain] = useState<ReportingChainItem[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const fetchChain = async () => {
        try {
          const res = await hierarchyService.getMyReportingChain();
          if (res.success) {
            setChain(res.data || []);
            setCurrentEmployee(res.current);
          } else {
            // Don't show error for no reporting chain
            if (res.error && !res.error.includes('404')) {
              toast.error(res.error);
            }
            setChain([]);
          }
        } catch (error) {
          console.error('Failed to fetch reporting chain:', error);
          setChain([]);
        } finally {
          setLoading(false);
        }
      };
      fetchChain();
    }
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get employee name from user if currentEmployee is not available
  const employeeName = currentEmployee?.name || user?.employee?.full_name || user?.name || 'You';
  const employeeDesignation = currentEmployee?.designation || (user?.employee as any)?.designation?.name || 'Employee';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* Current Employee */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {employeeName.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-slate-800 text-lg mt-3">{employeeName}</p>
            <p className="text-sm text-slate-500">{employeeDesignation}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <User size={10} />
                Current Position
              </span>
            </div>
          </div>
        </div>

        {/* Reporting Chain */}
        {chain.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <GitBranch size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">You are at the top of the reporting hierarchy</p>
            <p className="text-sm text-slate-400 mt-1">No one to report to</p>
          </div>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2" style={{ height: 'calc(100% - 80px)' }} />
            
            {chain.map((manager, index) => (
              <div key={manager.id} className="relative">
                <div className="flex items-center justify-center mb-4">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-4">
                    <ChevronRight size={20} className="text-slate-300 rotate-90" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition mx-auto max-w-md">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-lg font-bold">
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-base">{manager.name}</p>
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
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                      Direct Manager
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help text */}
        {chain.length === 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <Building2 size={16} />
              As a top-level employee, you don't report to anyone in the organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}