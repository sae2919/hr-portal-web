'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Pencil, Trash2, Briefcase, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useDesignations,
  useCreateDesignation,
  useUpdateDesignation,
  useDeleteDesignation
} from '@/hooks/useDesignations';
import { useDepartments } from '@/hooks/useDepartments';
import { Designation } from '@/types/designation';

const desigSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  code: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  department_id: z.number().nullable().optional(),
});

type DesigFormData = z.infer<typeof desigSchema>;

function DesignationModal({ open, onClose, designation, departments }: {
  open: boolean;
  onClose: () => void;
  designation?: Designation | null;
  departments: any[];
}) {
  const isEdit = !!designation;
  const { mutate: create, isPending: creating } = useCreateDesignation();
  const { mutate: update, isPending: updating } = useUpdateDesignation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DesigFormData>({
    resolver: zodResolver(desigSchema),
    defaultValues: {
      title: designation?.title ?? '',
      code: designation?.code ?? '',
      description: designation?.description ?? '',
      status: designation?.status ?? 'active',
      department_id: designation?.department_id ?? null,
    },
  });

  // Reset form when designation changes
  useEffect(() => {
    reset({
      title: designation?.title ?? '',
      code: designation?.code ?? '',
      description: designation?.description ?? '',
      status: designation?.status ?? 'active',
      department_id: designation?.department_id ?? null,
    });
  }, [designation, reset]);

  const onSubmit = (data: DesigFormData) => {
    const payload = {
      title: data.title,
      code: data.code || undefined,
      description: data.description || undefined,
      status: data.status,
      department_id: data.department_id ?? null,
    };

    if (isEdit && designation) {
      update(
        { id: designation.id, ...payload },
        {
          onSuccess: () => {
            onClose();
            reset();
          },
        }
      );
    } else {
      create(payload, {
        onSuccess: () => {
          onClose();
          reset();
        },
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isEdit ? 'Edit Designation' : 'New Designation'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update designation details' : 'Add a new designation'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Designation Title <span className="text-red-500">*</span>
            </Label>
            <Input placeholder="e.g. Senior Software Engineer" {...register('title')} className="h-10 bg-white" />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Code <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input placeholder="e.g. SR_SWE" {...register('code')} className="h-10 bg-white" />
              {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <select
                {...register('status')}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Department</Label>
            <select
              {...register('department_id', { setValueAs: v => v === '' ? null : Number(v) })}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.department_id && <p className="text-red-500 text-xs">{errors.department_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <textarea
              placeholder="Designation description..."
              {...register('description')}
              className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || updating} className="bg-blue-600 hover:bg-blue-700 text-white">
              {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Designation' : 'Create Designation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DesignationsPage() {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);

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

  const { data: departmentsResponse } = useDepartments({ page: 1, per_page: 100 });
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

  const openCreateModal = () => {
    setSelectedDesignation(null);
    setModalOpen(true);
  };

  const openEditModal = (designation: Designation) => {
    setSelectedDesignation(designation);
    setModalOpen(true);
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
          className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm text-white"
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Designation
        </Button>
      </div>

      {/* Search & Filter Component Wrapper */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white">
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
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 bg-white"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 h-10 outline-none"
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
      <Card className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
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
                designations.map((designation: Designation) => (
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
                          <p className="text-xs text-slate-400 max-w-xs truncate">{designation.description || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs border border-slate-200/40 shadow-none">
                        {designation.code || '—'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {designation.department?.name || '—'}
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`px-3 py-1 rounded-md text-xs font-normal border ${
                          designation.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {designation.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(designation)}
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

        {/* ── PAGINATION FOOTER ── */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 select-none">
            <p className="text-xs text-slate-400">
              Showing <span className="font-medium text-slate-600">{from}–{to}</span> of <span className="font-medium text-slate-600">{total}</span> designations
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none bg-white text-slate-700"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, lastPage))}
                disabled={page === lastPage}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none bg-white text-slate-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <DesignationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        designation={selectedDesignation}
        departments={departments}
      />
    </div>
  );
}