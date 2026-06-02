'use client';

import { useState, useEffect } from 'react';
import {
  useLeaves, useLeaveTypes,
  useApplyLeave, useApproveLeave, useRejectLeave,
  useDeleteLeave, useTeamLeadApprove, useTeamLeadReject,
} from '@/hooks/useLeaves';
import { useEmployees }   from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { Leave, ApplyLeavePayload } from '@/types/leave';
import { Department } from '@/types/department';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Badge }  from '@/components/ui/badge';
import { Plus, Loader2, Calendar, X, Check, XCircle, Trash2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── Status config ──────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  approved:  { label: 'Approved',  color: 'bg-green-50 text-green-700 border border-green-200' },
  rejected:  { label: 'Rejected',  color: 'bg-red-50 text-red-600 border border-red-200' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

const tlStatusConfig: Record<string, { label: string; dot: string; text: string }> = {
  pending:  { label: 'TL: Pending',  dot: 'bg-amber-400',  text: 'text-amber-600' },
  approved: { label: 'TL: Approved', dot: 'bg-blue-400',   text: 'text-blue-600' },
  rejected: { label: 'TL: Rejected', dot: 'bg-red-400',    text: 'text-red-500' },
};

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  employee_id:   z.number({ error: 'Select employee' }).min(1),
  leave_type_id: z.number({ error: 'Select leave type' }).min(1),
  start_date:    z.string().min(1, 'Required'),
  end_date:      z.string().min(1, 'Required'),
  reason:        z.string().min(10, 'At least 10 characters'),
}).refine((d) => !d.start_date || !d.end_date || new Date(d.end_date) >= new Date(d.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});
type FormData = z.infer<typeof schema>;

// ── Apply Leave Modal ──────────────────────────────────────────
function ApplyLeaveModal({
  open, onClose, currentEmployeeId, isAdmin,
}: { open: boolean; onClose: () => void; currentEmployeeId?: number; isAdmin: boolean }) {
  const { mutate: apply, isPending } = useApplyLeave();
  const { data: employees = [] }     = useEmployees();
  const { data: leaveTypes = [] }    = useLeaveTypes();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { start_date: '', end_date: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      if (currentEmployeeId && !isAdmin) setValue('employee_id', Number(currentEmployeeId));
      else setValue('employee_id', undefined as any);
      setValue('leave_type_id', undefined as any);
    }
  }, [currentEmployeeId, isAdmin, setValue, open]);

  const onSubmit = (data: FormData) =>
    apply(data, { onSuccess: () => { onClose(); reset(); } });

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
              <p className="text-xs text-slate-400">Request will go to your team lead first</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isAdmin ? (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Employee <span className="text-red-500">*</span></Label>
              <select {...register('employee_id', { valueAsNumber: true })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name || `${e.first_name} ${e.last_name}`} ({e.employee_code})
                  </option>
                ))}
              </select>
              {errors.employee_id && <p className="text-red-500 text-xs">{errors.employee_id.message}</p>}
            </div>
          ) : (
            <input type="hidden" {...register('employee_id', { valueAsNumber: true })} />
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Leave Type <span className="text-red-500">*</span></Label>
            <select {...register('leave_type_id', { valueAsNumber: true })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Select type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.days_per_year ? ` (${t.days_per_year}d/yr)` : ''}</option>
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
            <textarea {...register('reason')} rows={3} placeholder="Explain the reason..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            {errors.reason && <p className="text-red-500 text-xs">{errors.reason.message}</p>}
          </div>

          {/* Flow info */}
          {!isAdmin && (
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600 flex items-start gap-2">
              <span className="mt-0.5">ℹ️</span>
              <span>Your request will first go to your <strong>Team Lead</strong>, then to <strong>HR/Admin</strong> for final approval.</span>
            </div>
          )}

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

// ── Reject Modal (shared for TL + HR reject) ───────────────────
function RejectModal({
  leave, onClose, mode,
}: {
  leave: Leave | null;
  onClose: () => void;
  mode: 'hr' | 'teamlead';
}) {
  const { mutate: hrReject,  isPending: hrPending }  = useRejectLeave();
  const { mutate: tlReject,  isPending: tlPending }  = useTeamLeadReject();
  const [reason, setReason] = useState('');

  useEffect(() => { if (!leave) setReason(''); }, [leave]);

  if (!leave) return null;
  const isPending = mode === 'hr' ? hrPending : tlPending;
  const title     = mode === 'teamlead' ? 'Team Lead Reject' : 'HR Reject Leave';
  const btnColor  = 'bg-red-500 hover:bg-red-600 text-white';

  const handleSubmit = () => {
    if (mode === 'teamlead') {
      tlReject({ id: leave.id, rejection_reason: reason }, { onSuccess: onClose });
    } else {
      hrReject({ id: leave.id, rejection_reason: reason }, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-4">
          Rejecting leave for <span className="font-medium text-slate-700">{leave.employee?.full_name}</span>.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejection (min 5 chars)..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-4"
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || reason.length < 5} className={`flex-1 ${btnColor}`}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── TL Status Badge ────────────────────────────────────────────
function TLBadge({ leave }: { leave: Leave }) {
  const tl = tlStatusConfig[leave.team_lead_status ?? 'pending'];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${tl.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tl.dot}`} />
      <span>{tl.label}</span>
      {leave.team_lead?.name && (
        <span className="text-slate-400 font-normal">· {leave.team_lead.name}</span>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function LeavesPage() {
  const [page, setPage]               = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept]   = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterTL, setFilterTL]       = useState('');
  const [applyOpen, setApplyOpen]     = useState(false);
  const [rejectModal, setRejectModal] = useState<{ leave: Leave; mode: 'hr' | 'teamlead' } | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [tab,setTab] = useState('leaves');

  const { hasPermission, user } = useAuthStore();
  useEffect(() => setMounted(true), []);
  useEffect(() => setPage(1), [filterStatus, filterDept, filterType, filterTL]);

  const isAdmin    = mounted && (user?.role === 'admin' || hasPermission('manage leaves') || hasPermission('approve leave'));
  const isTeamLead = mounted && (user?.role === 'manager' || user?.role === 'team_lead' || hasPermission('team lead approve'));
  const canApply   = mounted && (hasPermission('apply leave') || !!user?.employee_id);
  const canHRApprove  = isAdmin;
  const canHRReject   = isAdmin;
  const canTLApprove  = isTeamLead || isAdmin;
  const canTLReject   = isTeamLead || isAdmin;

  const { data: leavesResponse, isLoading } = useLeaves({
    page,
    per_page: 10,
    status:           filterStatus || undefined,
    department_id:    filterDept ? Number(filterDept) : undefined,
    leave_type_id:    filterType ? Number(filterType) : undefined,
    team_lead_status: filterTL || undefined,
    employee_id:      isAdmin || isTeamLead ? undefined : user?.employee_id ?? undefined,
  });

  const leaves = Array.isArray(leavesResponse) ? leavesResponse : leavesResponse?.data ?? [];
  const meta   = (!Array.isArray(leavesResponse) && leavesResponse?.meta) ? leavesResponse.meta : null;

  const { data: leaveTypes = [] }     = useLeaveTypes();
  const { data: departmentsResponse } = useDepartments();
  const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

  const { mutate: hrApprove }    = useApproveLeave();
  const { mutate: tlApprove }    = useTeamLeadApprove();
  const { mutate: deleteLeave }  = useDeleteLeave();

  const stats = {
    total:    meta?.total ?? leaves.length,
    pending:  leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
    tlPending: leaves.filter((l) => l.team_lead_status === 'pending' && l.status === 'pending').length,
  };

  const showTLCol = isAdmin;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Leave Management</h2>
          <p className="text-sm text-slate-400">{stats.total} applications total</p>
        </div>
        {canApply && (
          <Button onClick={() => setApplyOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <Plus size={16} /> Apply Leave
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       count: stats.total,     color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-100' },
          { label: 'Pending',     count: stats.pending,   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
          { label: 'Approved',    count: stats.approved,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
          { label: 'Rejected',    count: stats.rejected,  color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
          { label: 'TL Awaiting', count: stats.tlPending, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border ${s.border} p-4`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none">
          <option value="">All Leave Types</option>
          {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {showTLCol && (
          <select value={filterTL} onChange={(e) => setFilterTL(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none">
            <option value="">All TL Status</option>
            <option value="pending">TL Pending</option>
            <option value="approved">TL Approved</option>
            <option value="rejected">TL Rejected</option>
          </select>
        )}

        {isAdmin && (
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none">
            <option value="">All Departments</option>
            {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {(isAdmin || isTeamLead) && (
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
              )}
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Duration</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Days</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Reason</th>
              {showTLCol && (
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Team Lead</th>
              )}
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={showTLCol ? 8 : 7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={showTLCol ? 8 : 7} className="text-center py-12">
                  <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No leave applications found</p>
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const tlStatus     = leave.team_lead_status ?? 'pending';
                const overallPend  = leave.status === 'pending';
                const tlActed      = tlStatus !== 'pending';
                const tlApproved   = tlStatus === 'approved';
                const tlRejected   = tlStatus === 'rejected';

                return (
                  <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">

                    {/* Employee */}
                    {(isAdmin || isTeamLead) && (
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">{leave.employee?.full_name}</p>
                        <p className="text-xs text-slate-400">{leave.employee?.department?.name ?? leave.employee?.department}</p>
                      </td>
                    )}

                    {/* Type */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: leave.leave_type?.color ?? '#6B7280' }} />
                        <span className="text-slate-600">{leave.leave_type?.name}</span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      <p>{leave.start_date}</p>
                      <p className="text-slate-400">to {leave.end_date}</p>
                    </td>

                    {/* Days */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-700">{leave.days}</span>
                      <span className="text-slate-400 text-xs ml-1">days</span>
                    </td>

                    {/* Reason */}
                    <td className="px-5 py-4 max-w-[160px]">
                      <p className="text-slate-600 text-xs truncate">{leave.reason}</p>
                      {leave.rejection_reason && (
                        <p className="text-red-400 text-xs mt-0.5 truncate">↳ {leave.rejection_reason}</p>
                      )}
                      {leave.team_lead_rejection_reason && !leave.rejection_reason && (
                        <p className="text-orange-400 text-xs mt-0.5 truncate">TL: {leave.team_lead_rejection_reason}</p>
                      )}
                    </td>

                    {/* Team Lead Status */}
                    {showTLCol && (
                      <td className="px-5 py-4">
                        <TLBadge leave={leave} />
                        {leave.team_lead_acted_at && (
                          <p className="text-xs text-slate-400 mt-0.5">{leave.team_lead_acted_at}</p>
                        )}
                      </td>
                    )}

                    {/* Overall Status */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={statusConfig[leave.status]?.color ?? ''}>
                          {statusConfig[leave.status]?.label ?? leave.status}
                        </Badge>
                        {/* Show "HR Override" badge if HR approved after TL rejection */}
                        {leave.status === 'approved' && tlRejected && (
                          <span className="text-xs text-purple-500 font-medium flex items-center gap-1">
                            <ShieldAlert size={10} /> HR Override
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">

                        {/* ── Team Lead buttons (TL + Admin) ── */}
                        {canTLApprove && overallPend && tlStatus === 'pending' && (
                          <button
                            onClick={() => tlApprove(leave.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Team Lead Approve"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {canTLReject && overallPend && tlStatus === 'pending' && (
                          <button
                            onClick={() => setRejectModal({ leave, mode: 'teamlead' })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors"
                            title="Team Lead Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        {/* ── HR/Admin final approve ──
                            - shown when TL approved (normal flow)
                            - OR when TL rejected (override flow) — only for HR/Admin
                        ── */}
                        {canHRApprove && leave.status !== 'approved' && (tlApproved || tlRejected) && (
                          <button
                            onClick={() => hrApprove(leave.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              tlRejected
                                ? 'hover:bg-purple-50 text-slate-400 hover:text-purple-600'
                                : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                            }`}
                            title={tlRejected ? 'HR Override Approve (TL rejected)' : 'HR Final Approve'}
                          >
                            <Check size={14} />
                          </button>
                        )}

                        {/* ── HR reject ── */}
                        {canHRReject && leave.status === 'pending' && tlApproved && (
                          <button
                            onClick={() => setRejectModal({ leave, mode: 'hr' })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="HR Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        {/* ── Delete ── */}
                        {isAdmin && leave.status !== 'approved' && (
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
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-700">{(page - 1) * 10 + 1}</strong> to{' '}
              <strong className="text-slate-700">{Math.min(page * 10, meta.total)}</strong> of{' '}
              <strong className="text-slate-700">{meta.total}</strong>
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p < meta.last_page ? p + 1 : p)}
                disabled={page === meta.last_page} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      

      {/* Modals */}
      <ApplyLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        currentEmployeeId={user?.employee_id ?? undefined}
        isAdmin={isAdmin}
      />
      <RejectModal
        leave={rejectModal?.leave ?? null}
        mode={rejectModal?.mode ?? 'hr'}
        onClose={() => setRejectModal(null)}
      />
    </div>
  );
}