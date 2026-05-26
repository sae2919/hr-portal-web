'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Pencil, Trash2, Briefcase, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDesignations, useDeleteDesignation } from '@/hooks/useDesignations';
import { useDepartments } from '@/hooks/useDepartments';

export default function DesignationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);

  const { data: designationsResponse, isLoading } = useDesignations({
    page,
    search,
    department_id: filterDept ? Number(filterDept) : undefined,
  });

  const designations = Array.isArray(designationsResponse?.data)
    ? designationsResponse.data
    : [];

  const meta = designationsResponse?.meta || {};
  const total    = meta?.total ?? 0;
  const lastPage = meta?.last_page ?? 1;
  const from     = meta?.from ?? 0;
  const to       = meta?.to ?? 0;

  const { data: departmentsResponse } = useDepartments({ page: 1 });
  const departments = Array.isArray(departmentsResponse?.data)
    ? departmentsResponse.data
    : [];

  const deleteDesignation = useDeleteDesignation();

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;
    try {
      await deleteDesignation.mutateAsync(id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Designations</h1>
          <p className="text-slate-500 mt-1">{total} designations total</p>
        </div>
        <Button
          className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
          onClick={() => router.push('/designations/create')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Designation
        </Button>
      </div>

      {/* Search & Filter Component Wrapper */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search designations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-transparent font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 h-10 outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Grid Data Matrix Table */}
      <Card className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Title</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : designations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No designations found
                  </td>
                </tr>
              ) : (
                designations.map((designation: any) => (
                  <tr
                    key={designation.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{designation.title}</p>
                          <p className="text-xs text-slate-400 max-w-xs truncate">{designation.description || '-'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs border border-slate-200/40 shadow-none">
                        {designation.code || '—'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {designation.department?.name || '-'}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-normal border ${
                          designation.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {designation.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/designations/${designation.id}/edit`)}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(designation.id)}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── UNIFIED RECRUITMENT STYLE PAGINATION FOOTER ── */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 select-none">
            <p className="text-xs text-slate-400">
              Showing <span className="font-medium text-slate-600">{from}–{to}</span> of <span className="font-medium text-slate-600">{total}</span> pipeline files
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, lastPage))}
                disabled={page === lastPage}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}