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
      update({ id: department.id, ...payload }, { onSuccess: () => { onClose(); reset(); } });
    } else {
      create(payload, { onSuccess: () => { onClose(); reset(); } });
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
              <h2 className="text-lg font-semibold text-slate-800">{isEdit ? 'Edit Department' : 'New Department'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update department details' : 'Add a new department'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Department Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Engineering" {...register('name')} className="h-10" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Code <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g. ENG" {...register('code')} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <textarea {...register('description')} rows={2} placeholder="Brief description..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Parent Department <span className="text-slate-400 font-normal">(optional)</span></Label>
            <select {...register('parent_id', { setValueAs: (v) => v === '' ? null : Number(v) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">None (Top Level)</option>
              {departments.filter((d) => d.id !== department?.id).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Status</Label>
            <select {...register('status')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={creating || updating} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
              {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ department, onClose }: { department: Department | null; onClose: () => void }) {
  const { mutate: deleteDept, isPending } = useDeleteDepartment();
  if (!department) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Delete Department</h3>
          <p className="text-slate-500 text-sm mt-2">Are you sure you want to delete <span className="font-medium text-slate-700">{department.name}</span>? This cannot be undone.</p>
          {department.employee_count > 0 && (
            <p className="text-amber-600 text-xs mt-2 bg-amber-50 px-3 py-2 rounded-lg">This department has {department.employee_count} employee(s). Reassign them first.</p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => deleteDept(department.id, { onSuccess: onClose })} disabled={isPending || department.employee_count > 0} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editDept, setEditDept]     = useState<Department | null>(null);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);
  const [mounted, setMounted]       = useState(false);
  const { hasPermission }           = useAuthStore();

  useEffect(() => setMounted(true), []);

  const { data: departments = [], isLoading } = useDepartments({ search });

  const canCreate = mounted && hasPermission('create departments');
  const canEdit   = mounted && hasPermission('edit departments');
  const canDelete = mounted && hasPermission('delete departments');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Departments</h2>
          <p className="text-sm text-slate-400">{departments.length} department{departments.length !== 1 ? 's' : ''} total</p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <Plus size={16} />Add Department
          </Button>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Department</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Code</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Parent</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employees</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              {(canEdit || canDelete) && <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12">
                <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">No departments found</p>
              </td></tr>
            ) : departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{dept.name}</p>
                      {dept.description && <p className="text-xs text-slate-400 truncate max-w-xs">{dept.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {dept.code ? <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{dept.code}</span> : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-5 py-4 text-slate-500">{dept.parent?.name ?? <span className="text-slate-300">-</span>}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users size={13} className="text-slate-400" /><span>{dept.employee_count}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge className={dept.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' : 'bg-slate-100 text-slate-500'}>
                    {dept.status}
                  </Badge>
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => { setEditDept(dept); setModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteDept(dept)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DepartmentModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDept(null); }} department={editDept} departments={departments} />
      <DeleteModal department={deleteDept} onClose={() => setDeleteDept(null)} />
    </div>
  );
}