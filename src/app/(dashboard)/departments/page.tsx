'use client';

import { useState, useEffect } from 'react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/useDepartments';
import { Department, StoreDepartmentPayload } from '@/types/department';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Loader2, Building2, X, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const deptSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  parent_id: z.number().nullable().optional(),
});

type DeptFormData = z.infer<typeof deptSchema>;

function DepartmentModal({ open, onClose, department, departments }: {
  open: boolean;
  onClose: () => void;
  department?: Department | null;
  departments: Department[];
}) {
  const isEdit = !!department;
  const { mutate: create, isPending: creating } = useCreateDepartment();
  const { mutate: update, isPending: updating } = useUpdateDepartment();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
    defaultValues: {
      name: department?.name ?? '',
      code: department?.code ?? '',
      description: department?.description ?? '',
      status: department?.status ?? 'active',
      parent_id: department?.parent_id ?? null,
    },
  });

  const onSubmit = (data: DeptFormData) => {
    const payload: StoreDepartmentPayload = {
      name: data.name,
      code: data.code || undefined,
      description: data.description || undefined,
      status: data.status,
      parent_id: data.parent_id ?? null,
    };

    if (isEdit && department) {
      update(
        { id: department.id, ...payload },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isEdit ? 'Edit Department' : 'New Department'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update department details' : 'Add a new department'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input placeholder="e.g. Engineering" {...register('name')} className="h-10" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Code <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input placeholder="e.g. ENG" {...register('code')} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <textarea
              placeholder="Department description"
              {...register('description')}
              className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || updating} className="bg-blue-600 hover:bg-blue-700">
              {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const { data, isLoading } = useDepartments({ search, page, per_page: 10 });
  const { mutate: deleteDepartment } = useDeleteDepartment();

  const departments = data?.data || [];

  // ── pagination meta data normalization ──
  const total    = data?.meta?.total ?? 0;
  const lastPage = data?.meta?.last_page ?? 1;
  const from     = data?.meta?.from ?? 0;
  const to       = data?.meta?.to ?? 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openCreateModal = () => {
    setSelectedDepartment(null);
    setModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setModalOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteDepartment(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Departments</h1>
          <p className="text-slate-400 mt-1">{total} departments total</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Search Input Filter Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search departments..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table Display Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Parent</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Employees</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No departments found
                  </td>
                </tr>
              ) : (
                departments.map((department: Department) => (
                  <tr key={department.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{department.name}</p>
                          <p className="text-xs text-slate-400 max-w-xs truncate">{department.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="shadow-none rounded-md font-mono text-xs">{department.code || '—'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {department.parent?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>{department.employee_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={
                          department.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200 font-normal rounded-md'
                            : 'bg-red-50 text-red-700 border-red-200 font-normal rounded-md'
                        }
                      >
                        {department.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(department)}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(department.id, department.name)}
                          className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
      </div>

      <DepartmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        department={selectedDepartment}
        departments={departments}
      />
    </div>
  );
}