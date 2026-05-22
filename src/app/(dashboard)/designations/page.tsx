'use client';

import { useState, useEffect } from 'react';
import { useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation } from '@/hooks/useDesignations';
import { useDepartments } from '@/hooks/useDepartments';
import { Designation, StoreDesignationPayload } from '@/types/designation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Loader2, Briefcase, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  title:         z.string().min(2, 'Title must be at least 2 characters'),
  code:          z.string().max(20).optional().or(z.literal('')),
  description:   z.string().max(500).optional().or(z.literal('')),
  status:        z.enum(['active', 'inactive']),
  department_id: z.number().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

function DesignationModal({ open, onClose, designation }: {
  open: boolean;
  onClose: () => void;
  designation?: Designation | null;
}) {
  const isEdit = !!designation;
  const { mutate: create, isPending: creating } = useCreateDesignation();
  const { mutate: update, isPending: updating } = useUpdateDesignation();
  const { data: departments = [] } = useDepartments();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:         designation?.title         ?? '',
      code:          designation?.code          ?? '',
      description:   designation?.description   ?? '',
      status:        designation?.status        ?? 'active',
      department_id: designation?.department_id ?? null,
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: StoreDesignationPayload = {
      title:         data.title,
      code:          data.code || undefined,
      description:   data.description || undefined,
      status:        data.status,
      department_id: data.department_id ?? null,
    };
    if (isEdit && designation) {
      update({ id: designation.id, ...payload }, { onSuccess: () => { onClose(); reset(); } });
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
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{isEdit ? 'Edit Designation' : 'New Designation'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update designation details' : 'Add a new job title'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Job Title <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Software Engineer" {...register('title')} className="h-10" />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Code <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g. SE" {...register('code')} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Department <span className="text-slate-400 font-normal">(optional)</span></Label>
            <select {...register('department_id', { setValueAs: (v) => v === '' ? null : Number(v) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <textarea {...register('description')} rows={2} placeholder="Brief description..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
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

function DeleteModal({ designation, onClose }: { designation: Designation | null; onClose: () => void }) {
  const { mutate: deleteDesig, isPending } = useDeleteDesignation();
  if (!designation) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Delete Designation</h3>
          <p className="text-slate-500 text-sm mt-2">Are you sure you want to delete <span className="font-medium text-slate-700">{designation.title}</span>? This cannot be undone.</p>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => deleteDesig(designation.id, { onSuccess: onClose })} disabled={isPending} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DesignationsPage() {
  const [search, setSearch]           = useState('');
  const [filterDept, setFilterDept]   = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editDesig, setEditDesig]     = useState<Designation | null>(null);
  const [deleteDesig, setDeleteDesig] = useState<Designation | null>(null);
  const [mounted, setMounted]         = useState(false);
  const { hasPermission }             = useAuthStore();

  useEffect(() => setMounted(true), []);

  const { data: designations = [], isLoading } = useDesignations({
    search,
    department_id: filterDept ? Number(filterDept) : undefined,
  });
  const { data: departments = [] } = useDepartments();

  const canCreate = mounted && hasPermission('create designations');
  const canEdit   = mounted && hasPermission('edit designations');
  const canDelete = mounted && hasPermission('delete designations');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Designations</h2>
          <p className="text-sm text-slate-400">{designations.length} designation{designations.length !== 1 ? 's' : ''} total</p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <Plus size={16} /> Add Designation
          </Button>
        )}
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search designations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 w-64" />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-10">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Title</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Code</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Department</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              {(canEdit || canDelete) && <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : designations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">
                <Briefcase className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">No designations found</p>
              </td></tr>
            ) : designations.map((desig) => (
              <tr key={desig.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{desig.title}</p>
                      {desig.description && <p className="text-xs text-slate-400 truncate max-w-xs">{desig.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {desig.code ? <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{desig.code}</span> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">
                  {desig.department?.name ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  <Badge className={desig.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-100' : 'bg-slate-100 text-slate-500'}>
                    {desig.status}
                  </Badge>
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => { setEditDesig(desig); setModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteDesig(desig)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
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
      <DesignationModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDesig(null); }} designation={editDesig} />
      <DeleteModal designation={deleteDesig} onClose={() => setDeleteDesig(null)} />
    </div>
  );
}