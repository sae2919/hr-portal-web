'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api'; // ✅ Fixed: was axios from @/lib/axios

import { Briefcase, Users, Calendar, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  experience: number;
  status: string;
  interview_date: string | null;
  job?: { title: string };
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface RecruitmentData {
  stats: {
    total_jobs: number;
    total_candidates: number;
    interviews: number;
    selected: number;
  };
  candidates: Candidate[];
}

export default function RecruitmentPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [data, setData] = useState<RecruitmentData>({
    stats: { total_jobs: 0, total_candidates: 0, interviews: 0, selected: 0 },
    candidates: [],
  });

  useEffect(() => {
    fetchRecruitment(page);
  }, [page]);

  const fetchRecruitment = async (currentPage: number = 1) => {
    try {
      const response = await api.get('/v1/recruitment/dashboard', { // ✅ Fixed: added /v1
        params: { page: currentPage, per_page: 10 },
      });

      const stats = response.data?.stats || response.data?.data?.stats || {
        total_jobs: 0, total_candidates: 0, interviews: 0, selected: 0,
      };

      let candidatesList: Candidate[] = [];
      let paginationMeta = null;

      if (response.data?.meta) {
        candidatesList = Array.isArray(response.data.data) ? response.data.data : [];
        paginationMeta = response.data.meta;
      } else if (response.data?.candidates?.data) {
        candidatesList = response.data.candidates.data;
        paginationMeta = response.data.candidates.meta;
      } else if (response.data?.candidates) {
        candidatesList = Array.isArray(response.data.candidates) ? response.data.candidates : [];
      } else if (Array.isArray(response.data)) {
        candidatesList = response.data;
      }

      setData({ stats, candidates: candidatesList });
      setMeta(paginationMeta);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (candidateId: number, status: string) => {
    try {
      await api.patch(`/v1/candidates/${candidateId}/status`, { status }); // ✅ Fixed
      fetchRecruitment(page);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Recruitment</h1>
        <p className="text-slate-500 mt-2">Hiring pipeline and candidate management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { label: 'Open Jobs', value: data.stats.total_jobs, icon: Briefcase, color: 'bg-blue-100 text-blue-600' },
          { label: 'Candidates', value: data.stats.total_candidates, icon: Users, color: 'bg-purple-100 text-purple-600' },
          { label: 'Interviews', value: data.stats.interviews, icon: Calendar, color: 'bg-orange-100 text-orange-600' },
          { label: 'Selected', value: data.stats.selected, icon: UserCheck, color: 'bg-green-100 text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{stat.label}</p>
                <h3 className="text-4xl font-bold mt-3">{stat.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.color.split(' ')[0]}`}>
                <stat.icon className={`w-7 h-7 ${stat.color.split(' ')[1]}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Candidate', 'Job', 'Experience', 'Status', 'Interview', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-slate-400">No matching pipeline candidates located</td>
                </tr>
              ) : (
                data.candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{candidate.first_name} {candidate.last_name}</p>
                      <p className="text-sm text-slate-500">{candidate.email}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{candidate.job?.title}</td>
                    <td className="px-6 py-4 text-slate-700">{candidate.experience} years</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        candidate.status === 'selected' ? 'bg-green-100 text-green-700' :
                        candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        candidate.status === 'hired' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{candidate.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {candidate.interview_date ? new Date(candidate.interview_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {['selected', 'rejected', 'hired'].includes(candidate.status) ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            candidate.status === 'selected' ? 'bg-green-100 text-green-700' :
                            candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{candidate.status}</span>
                        ) : (
                          <>
                            <button onClick={() => updateStatus(candidate.id, 'selected')} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-lg transition-colors">Select</button>
                            <button onClick={() => updateStatus(candidate.id, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-lg transition-colors">Reject</button>
                            <button onClick={() => updateStatus(candidate.id, 'hired')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-lg transition-colors">Hire</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{((page - 1) * 10) + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * 10, meta.total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{meta.total}</span> pipeline files
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p < meta.last_page ? p + 1 : p)} disabled={page === meta.last_page} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}