'use client';

import { useState, useEffect } from 'react';
import {
  useLeaves, useLeaveTypes, useApplyLeave,
  useApproveLeave, useRejectLeave, useDeleteLeave,
} from '@/hooks/useLeaves';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { Leave, ApplyLeavePayload } from '@/types/leave';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Loader2, Calendar, X, Check,
  XCircle, Trash2, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── Status Config ─────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  approved:  { label: 'Approved',  color: 'bg-green-50 text-green-700 border-green-100' },
  rejected:  { label: 'Rejected',  color: 'bg-red-50 text-red-600 border-red-100' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

// ── Apply Leave Modal ─────────────────────────────────────────────
const schema = z.object({
  employee_id:   z.number({ required_error: 'Select employee' }),
  leave_type_id: z.number({ required_error: 'Select leave type' }),
  start_date:    z.string().min(1, 'Start date required'),
  end_date:      z.string().min(1, 'End date required'),
  reason:        z.string().min(10, 'Reason must be at least 10 characters'),
}).refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type FormData = z.infer<typeof schema>;

function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate: apply, isPending } = useApplyLeave();
  const { data: employees = [] }     = useEmployees();
  const { data: leaveTypes = [] }    = useLeaveTypes();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    const payload: ApplyLeavePayload = {
      employee_id:   data.employee_id,
      leave_type_id: data.leave_type_id,
      start_date:    data.start_date,
      end_date:      data.end_date,
      reason:        data.reason,
    };
    apply(payload, { onSuccess: () => { onClose(); reset(); } });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Apply for Leave</h2>
              <p className="text-xs text-slate-400">Submit a leave request</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Employee <span className="text-red-500">*</span>
            </Label>
            <select
              {...register('employee_id', { valueAsNumber: true })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.employee_code})
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="text-red-500 text-xs">{errors.employee_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Leave Type <span className="text-red-500">*</span>
            </Label>
            <select
              {...register('leave_type_id', { valueAsNumber: true })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.days_per_year} days/year)
                </option>
              ))}
            </select>
            {errors.leave_type_id && <p className="text-red-500 text-xs">{errors.leave_type_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Start Date <span className="text-red-500">*</span></Label>
              <Input type="date" {...register('start_date')} className="h-10" />
              {errors.start_date && <p className="text-red-500 text-xs">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">End Date <span className="text-red-500">*</span></Label>
              <Input type="date" {...register('end_date')} className="h-10" />
              {errors.end_date && <p className="text-red-500 text-xs">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></Label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Explain the reason for leave..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.reason && <p className="text-red-500 text-xs">{errors.reason.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────
function RejectModal({ leave, onClose }: { leave: Leave | null; onClose: () => void }) {
  const { mutate: reject, isPending } = useRejectLeave();
  const [reason, setReason] = useState('');

  if (!leave) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Reject Leave</h3>
        <p className="text-sm text-slate-500 mb-4">
          Rejecting leave for <span className="font-medium text-slate-700">{leave.employee?.full_name}</span>.
          Please provide a reason.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejection..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 mb-4"
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => reject({ id: leave.id, rejection_reason: reason }, { onSuccess: onClose })}
            disabled={isPending || reason.length < 5}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LeavesPage() {
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterDept, setFilterDept]       = useState('');
  const [filterType, setFilterType]       = useState('');
  const [applyOpen, setApplyOpen]         = useState(false);
  const [rejectLeave, setRejectLeave]     = useState<Leave | null>(null);
  const [mounted, setMounted]             = useState(false);
  const { hasPermission }                 = useAuthStore();

  useEffect(() => setMounted(true), []);

  const canApply   = mounted && hasPermission('apply leave');
  const canApprove = mounted && hasPermission('approve leave');
  const canReject  = mounted && hasPermission('reject leave');

  const { data: leaves = [], isLoading }  = useLeaves({
    status:        filterStatus || undefined,
    department_id: filterDept ? Number(filterDept) : undefined,
    leave_type_id: filterType ? Number(filterType) : undefined,
  });
  const { data: leaveTypes = [] }  = useLeaveTypes();
  const { data: departments = [] } = useDepartments();
  const { mutate: approve }        = useApproveLeave();
  const { mutate: deleteLeave }    = useDeleteLeave();

  // Stats
  const stats = {
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    total:    leaves.length,
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Leave Management</h2>
          <p className="text-sm text-slate-400">{leaves.length} applications total</p>
        </div>
        {canApply && (
          <Button
            onClick={() => setApplyOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <Plus size={16} /> Apply Leave
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    count: stats.total,    color: 'text-slate-700',  bg: 'bg-slate-50' },
          { label: 'Pending',  count: stats.pending,  color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Approved', count: stats.approved, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Rejected', count: stats.rejected, color: 'text-red-500',    bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 p-4`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none"
        >
          <option value="">All Leave Types</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Leave Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Duration</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Days</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Reason</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No leave applications found</p>
                </td>
              </tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700">{leave.employee?.full_name}</p>
                    <p className="text-xs text-slate-400">{leave.employee?.department}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: leave.leave_type?.color ?? '#6B7280' }}
                      />
                      <span className="text-slate-600">{leave.leave_type?.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    <p>{leave.start_date}</p>
                    <p className="text-slate-400">to {leave.end_date}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-700">{leave.days}</span>
                    <span className="text-slate-400 text-xs ml-1">days</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-600 text-xs max-w-xs truncate">{leave.reason}</p>
                    {leave.rejection_reason && (
                      <p className="text-red-400 text-xs mt-0.5">
                        Reason: {leave.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge className={statusConfig[leave.status]?.color ?? ''}>
                      {statusConfig[leave.status]?.label ?? leave.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {canApprove && leave.status === 'pending' && (
                        <button
                          onClick={() => approve(leave.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {canReject && leave.status === 'pending' && (
                        <button
                          onClick={() => setRejectLeave(leave)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      {leave.status !== 'approved' && (
                        <button
                          onClick={() => deleteLeave(leave.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <RejectModal leave={rejectLeave} onClose={() => setRejectLeave(null)} />
    </div>
  );
}