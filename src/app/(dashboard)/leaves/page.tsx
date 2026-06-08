'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  useLeaves, useLeaveTypes,
  useApplyLeave, useApproveLeave, useRejectLeave,
  useDeleteLeave, useTeamLeadApprove, useTeamLeadReject,
  useAllLeaveBalances, useCreateLeaveType, useUpdateLeaveType, useDeleteLeaveType,
  useLeaveBalances,
} from '@/hooks/useLeaves';
import { useEmployees }   from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { Leave, ApplyLeavePayload, LeaveBalance, LeaveType, GroupedEmployeeLeaveBalances } from '@/types/leave';
import { Department } from '@/types/department';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Badge }  from '@/components/ui/badge';
import { Plus, Loader2, Calendar, X, Check, XCircle, Trash2, ShieldAlert, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveRoleTier } from '@/hooks/useAuth';
import LeaveCalendar from '@/components/leaves/LeaveCalendar';
import { SearchableSelect } from '@/components/ui/searchable-select';

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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
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
            <div className="space-y-1.5 font-sans">
              <Label className="text-sm font-medium text-slate-700">Employee <span className="text-red-500">*</span></Label>
              <SearchableSelect
                options={[
                  { id: '', label: 'Select employee' },
                  ...employees.map((e) => ({
                    id: e.id,
                    label: `${e.full_name || `${e.first_name} ${e.last_name}`} (${e.employee_code})`,
                  }))
                ]}
                value={watch('employee_id') || ''}
                onChange={(val) => {
                  setValue('employee_id', val === '' ? '' as any : Number(val), { shouldValidate: true });
                }}
                placeholder="Select employee"
              />
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
              {leaveTypes.filter(t => t.status === 'active').map((t) => (
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

// ── Leave Type Zod Schema ──────────────────────────────────────
const leaveTypeSchema = z.object({
  name:          z.string().min(1, 'Name is required'),
  code:          z.string().min(1, 'Code is required'),
  days_per_year: z.number({ error: 'Days must be a number' }).min(0, 'Must be at least 0'),
  carry_forward: z.boolean(),
  is_paid:       z.boolean(),
  color:         z.string().min(1, 'Color is required'),
  description:   z.string().nullable().optional(),
  status:        z.enum(['active', 'inactive']),
});
type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;

function LeaveTypeModal({
  open, onClose, leaveType,
}: { open: boolean; onClose: () => void; leaveType: LeaveType | null }) {
  const { mutate: create, isPending: isCreating } = useCreateLeaveType();
  const { mutate: update, isPending: isUpdating } = useUpdateLeaveType();

  const isEdit = !!leaveType;
  const isPending = isCreating || isUpdating;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: '',
      code: '',
      days_per_year: 12,
      carry_forward: false,
      is_paid: true,
      color: '#3b82f6',
      description: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (leaveType) {
        setValue('name', leaveType.name);
        setValue('code', leaveType.code);
        setValue('days_per_year', leaveType.days_per_year);
        setValue('carry_forward', !!leaveType.carry_forward);
        setValue('is_paid', !!leaveType.is_paid);
        setValue('color', leaveType.color || '#3b82f6');
        setValue('description', leaveType.description || '');
        setValue('status', leaveType.status || 'active');
      } else {
        reset({
          name: '',
          code: '',
          days_per_year: 12,
          carry_forward: false,
          is_paid: true,
          color: '#3b82f6',
          description: '',
          status: 'active',
        });
      }
    }
  }, [open, leaveType, setValue, reset]);

  const onSubmit = (data: LeaveTypeFormData) => {
    const payload: Omit<LeaveType, 'id' | 'created_at'> = {
      name: data.name,
      code: data.code,
      days_per_year: data.days_per_year,
      carry_forward: data.carry_forward,
      is_paid: data.is_paid,
      color: data.color,
      description: data.description || null,
      status: data.status,
    };
    if (isEdit && leaveType) {
      update({ id: leaveType.id, ...payload }, { onSuccess: () => { onClose(); reset(); } });
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
          <h2 className="text-lg font-semibold text-slate-800">{isEdit ? 'Edit Leave Type' : 'Add Leave Type'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></Label>
            <Input type="text" {...register('name')} placeholder="e.g. Casual Leave" className="h-10" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Code <span className="text-red-500">*</span></Label>
              <Input type="text" {...register('code')} placeholder="e.g. CL" className="h-10" />
              {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Days Per Year <span className="text-red-500">*</span></Label>
              <Input type="number" {...register('days_per_year', { valueAsNumber: true })} className="h-10" />
              {errors.days_per_year && <p className="text-red-500 text-xs">{errors.days_per_year.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium">
              <input type="checkbox" {...register('carry_forward')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
              Carry Forward
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium">
              <input type="checkbox" {...register('is_paid')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
              Is Paid
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" {...register('color')} className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0 bg-transparent" />
                <Input type="text" {...register('color')} className="h-10 font-mono text-xs uppercase" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <select {...register('status')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <textarea {...register('description')} rows={2} placeholder="Description..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
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
  const [tab, setTab] = useState('my_leaves');
  const [loadFilters, setLoadFilters] = useState(false);

  // Leave balances state
  const [balancePage, setBalancePage] = useState(1);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceDept, setBalanceDept] = useState('');
  const [balanceType, setBalanceType] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Record<number, boolean>>({});

  const toggleEmployee = (id: number) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Leave types state
  const [leaveTypeModalOpen, setLeaveTypeModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);

  const { hasPermission, user } = useAuthStore();
  useEffect(() => setMounted(true), []);
  useEffect(() => setPage(1), [filterStatus, filterDept, filterType, filterTL]);
  useEffect(() => {
    setBalancePage(1);
  }, [balanceSearch, balanceDept, balanceType]);

  const roleTier   = mounted ? resolveRoleTier(user) : 'employee';
  const isAdmin    = mounted && (roleTier === 'admin' || roleTier === 'hr' || hasPermission('manage leaves'));
  const isTeamLead = mounted && !isAdmin && (roleTier === 'manager' || roleTier === 'team_lead' || roleTier === 'sales_manager' || hasPermission('approve leave'));
  const canApply   = mounted && (hasPermission('apply leave') || !!user?.employee_id);

  // Fetch current user's leave balances if they have a linked employee_id
  const myEmployeeId = user?.employee_id;
  const { data: myBalances = [], isLoading: isLoadingMyBalances } = useLeaveBalances(
    myEmployeeId ? Number(myEmployeeId) : 0,
    undefined,
    { enabled: mounted && !!myEmployeeId && tab === 'my_leaves' }
  );
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
    employee_id:      (isAdmin && tab === 'my_leaves') || (isTeamLead && tab === 'team_leaves') ? undefined : (user?.employee_id ?? undefined),
  }, {
    enabled: mounted,
  });

  let leaves = Array.isArray(leavesResponse) ? leavesResponse : leavesResponse?.data ?? [];
  if (mounted && isTeamLead && tab === 'team_leaves') {
    leaves = leaves.filter((l) => l.employee_id !== user?.employee_id);
  }
  const meta   = (!Array.isArray(leavesResponse) && leavesResponse?.meta) ? leavesResponse.meta : null;

  const { data: leaveTypes = [] }     = useLeaveTypes({ enabled: tab === 'leave_types' || loadFilters });
  const { data: departmentsResponse } = useDepartments(undefined, { enabled: tab === 'leave_balances' || loadFilters });
  const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

  const { data: balancesResponse, isLoading: isLoadingBalances } = useAllLeaveBalances({
    page: balancePage,
    per_page: 10,
    search: balanceSearch || undefined,
    department_id: balanceDept ? Number(balanceDept) : undefined,
    leave_type_id: balanceType ? Number(balanceType) : undefined,
  }, {
    enabled: tab === 'leave_balances',
  });

  const balances = balancesResponse?.data ?? [];
  const balanceMeta = balancesResponse?.meta ?? null;

  const { mutate: hrApprove }    = useApproveLeave();
  const { mutate: tlApprove }    = useTeamLeadApprove();
  const { mutate: deleteLeave }  = useDeleteLeave();
  const { mutate: deleteLeaveType } = useDeleteLeaveType();
  const { mutate: updateLeaveType } = useUpdateLeaveType();

  const handleDeleteLeaveType = (id: number) => {
    if (confirm('Are you sure you want to delete this leave type?')) {
      deleteLeaveType(id);
    }
  };

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
          <p className="text-sm text-slate-400">
            {tab === 'leave_balances'
              ? `${balanceMeta?.total ?? 0} employee balance records`
              : tab === 'leave_types'
              ? `${leaveTypes.length} configured types`
              : `${stats.total} applications total`}
          </p>
        </div>
        {tab === 'leave_types' ? (
          isAdmin && (
            <Button onClick={() => { setSelectedLeaveType(null); setLeaveTypeModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 animate-in fade-in zoom-in-95 duration-200">
              <Plus size={16} /> Add Leave Type
            </Button>
          )
        ) : (
          canApply && (
            <Button onClick={() => setApplyOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
              <Plus size={16} /> Apply Leave
            </Button>
          )
        )}
      </div>

      {/* Stat cards */}
      {tab !== 'leave_types' && tab !== 'leave_balances' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-in fade-in duration-300">
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
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-100 gap-6 pb-1">
        <button
          onClick={() => {
            setTab('my_leaves');
            setPage(1);
          }}
          className={`relative pb-3 text-sm font-semibold transition-all duration-300 hover:text-slate-900 ${
            tab === 'my_leaves' ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          {isAdmin ? 'Leaves' : 'My Leaves'}
          {tab === 'my_leaves' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
          )}
        </button>
        {isTeamLead && (
          <button
            onClick={() => {
              setTab('team_leaves');
              setPage(1);
            }}
            className={`relative pb-3 text-sm font-semibold transition-all duration-300 hover:text-slate-900 ${
              tab === 'team_leaves' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            Team Leaves
            {tab === 'team_leaves' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
            )}
          </button>
        )}
        <button
          onClick={() => {
            setTab('leave_calendar');
            setPage(1);
          }}
          className={`relative pb-3 text-sm font-semibold transition-all duration-300 hover:text-slate-900 ${
            tab === 'leave_calendar' ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          Leave Calendar
          {tab === 'leave_calendar' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setTab('leave_balances');
              setBalancePage(1);
            }}
            className={`relative pb-3 text-sm font-semibold transition-all duration-300 hover:text-slate-900 ${
              tab === 'leave_balances' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            Leave Balances
            {tab === 'leave_balances' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
            )}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => {
              setTab('leave_types');
            }}
            className={`relative pb-3 text-sm font-semibold transition-all duration-300 hover:text-slate-900 ${
              tab === 'leave_types' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            Leave Types
            {tab === 'leave_types' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
            )}
          </button>
        )}
      </div>

      {tab === 'leave_calendar' ? (
        <LeaveCalendar />
      ) : tab === 'leave_balances' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Search and filters for Leave Balances */}
          <div
            className="flex gap-3 flex-wrap"
            onMouseEnter={() => setLoadFilters(true)}
            onFocusCapture={() => setLoadFilters(true)}
          >
            <Input
              placeholder="Search employee name or code..."
              value={balanceSearch}
              onChange={(e) => setBalanceSearch(e.target.value)}
              className="w-full sm:max-w-xs h-10 bg-white border border-slate-200"
            />

            <div className="w-48">
              <SearchableSelect
                options={[
                  { id: '', label: 'All Leave Types' },
                  ...leaveTypes.map((t) => ({
                    id: t.id,
                    label: t.name
                  }))
                ]}
                value={balanceType === '' ? '' : Number(balanceType)}
                onChange={(val) => setBalanceType(val === '' ? '' : String(val))}
                placeholder="All Leave Types"
              />
            </div>

            {isAdmin && (
              <div className="w-48">
                <SearchableSelect
                  options={[
                    { id: '', label: 'All Departments' },
                    ...departments.map((d: Department) => ({
                      id: d.id,
                      label: d.name
                    }))
                  ]}
                  value={balanceDept === '' ? '' : Number(balanceDept)}
                  onChange={(val) => setBalanceDept(val === '' ? '' : String(val))}
                  placeholder="All Departments"
                />
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Leave Types</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Total Days</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Taken Days</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Remaining Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingBalances ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : balances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm">No leave balances found</p>
                    </td>
                  </tr>
                ) : (
                  balances.map((b) => {
                    const totalDaysSum = b.balances.reduce((acc, curr) => acc + Number(curr.total_days), 0);
                    const usedDaysSum = b.balances.reduce((acc, curr) => acc + Number(curr.used_days), 0);
                    const remainingDaysSum = b.balances.reduce((acc, curr) => acc + Number(curr.remaining_days), 0);
                    const pct = totalDaysSum > 0 ? (usedDaysSum / totalDaysSum) * 100 : 0;
                    const isExpanded = !!expandedEmployees[b.id];

                    return (
                      <Fragment key={b.id}>
                        {/* Parent Row */}
                        <tr
                          onClick={() => toggleEmployee(b.id)}
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                              <div>
                                <p className="font-semibold text-slate-700">{b.full_name}</p>
                                <p className="text-xs text-slate-400">
                                  {b.employee_code} · {b.department?.name ?? ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-normal">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                              {b.balances.length} types
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-slate-700 font-semibold">{totalDaysSum.toFixed(1)} days</td>
                          <td className="px-5 py-4">
                            <span className="text-slate-700 font-semibold">{usedDaysSum.toFixed(1)} days</span>
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-700 font-semibold text-emerald-600">{remainingDaysSum.toFixed(1)} days</td>
                        </tr>

                        {/* Collapsible Child Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="px-8 py-3.5 border-t border-slate-100/50">
                              <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-sm animate-in slide-in-from-top-1 duration-200">
                                <table className="w-full text-xs text-slate-600">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold text-left">
                                      <th className="px-5 py-3">Leave Type</th>
                                      <th className="px-5 py-3">Total Days</th>
                                      <th className="px-5 py-3">Taken Days</th>
                                      <th className="px-5 py-3">Remaining Days</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {b.balances.map((bal) => {
                                      const balPct = bal.total_days > 0 ? (bal.used_days / bal.total_days) * 100 : 0;
                                      return (
                                        <tr key={bal.id} className="hover:bg-slate-50/40 transition-colors">
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: bal.leave_type?.color ?? '#6B7280' }} />
                                              <span className="font-semibold text-slate-700">{bal.leave_type?.name}</span>
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 font-medium text-slate-600">{Number(bal.total_days).toFixed(1)} days</td>
                                          <td className="px-5 py-3">
                                            <span className="font-medium text-slate-600">{Number(bal.used_days).toFixed(1)} days</span>
                                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-1">
                                              <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${Math.min(balPct, 100)}%` }} />
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 font-semibold text-emerald-600">{Number(bal.remaining_days).toFixed(1)} days</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {balanceMeta && balanceMeta.last_page > 1 && (
              <div className="flex items-center justify-between p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{(balancePage - 1) * 10 + 1}</strong> to{' '}
                  <strong className="text-slate-700">{Math.min(balancePage * 10, balanceMeta.total)}</strong> of{' '}
                  <strong className="text-slate-700">{balanceMeta.total}</strong>
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setBalancePage((p) => Math.max(p - 1, 1))}
                    disabled={balancePage === 1} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBalancePage((p) => p < balanceMeta.last_page ? p + 1 : p)}
                    disabled={balancePage === balanceMeta.last_page} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'leave_types' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Leave Type</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Code</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Days/Year</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Carry Forward</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Paid/Unpaid</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
                  <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaveTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm">No leave types configured</p>
                    </td>
                  </tr>
                ) : (
                  leaveTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0 animate-in zoom-in-50 duration-300"
                            style={{ backgroundColor: t.color || '#6B7280' }} />
                          <div>
                            <p className="font-semibold text-slate-700">{t.name}</p>
                            {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.code}</td>
                      <td className="px-5 py-4 text-slate-700 font-semibold">{t.days_per_year} days</td>
                      <td className="px-5 py-4">
                        <Badge className={t.carry_forward ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}>
                          {t.carry_forward ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={t.is_paid ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}>
                          {t.is_paid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newStatus = t.status === 'active' ? 'inactive' : 'active';
                              updateLeaveType({ id: t.id, status: newStatus });
                            }}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                              t.status === 'active' ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                t.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-semibold ${t.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {t.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedLeaveType(t);
                              setLeaveTypeModalOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLeaveType(t.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Employee's Own Leave Balances */}
          {tab === 'my_leaves' && myEmployeeId && myBalances.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Remaining Leaves</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                {myBalances.map((bal) => {
                  const pct = bal.total_days > 0 ? (bal.used_days / bal.total_days) * 100 : 0;
                  return (
                    <div
                      key={bal.id}
                      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Vertical line indicator */}
                      <span
                        className="absolute top-0 left-0 w-1.5 h-full"
                        style={{ backgroundColor: bal.leave_type?.color ?? '#e2e8f0' }}
                      />
                      
                      <div className="pl-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-700 truncate max-w-[120px]" title={bal.leave_type?.name}>
                            {bal.leave_type?.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5">
                            {bal.leave_type?.code}
                          </span>
                        </div>
                        
                        <div className="pt-2">
                          <span className="text-2xl font-bold text-slate-800">
                            {Number(bal.remaining_days).toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-400 font-medium ml-1">days left</span>
                        </div>
                      </div>

                      <div className="pl-2 pt-3 space-y-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: bal.leave_type?.color ?? '#3b82f6'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>{Number(bal.used_days).toFixed(1)} taken</span>
                          <span>{Number(bal.total_days).toFixed(1)} total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div
            className="flex gap-3 flex-wrap"
            onMouseEnter={() => setLoadFilters(true)}
            onFocusCapture={() => setLoadFilters(true)}
          >
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 bg-white focus:outline-none">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="w-48">
              <SearchableSelect
                options={[
                  { id: '', label: 'All Leave Types' },
                  ...leaveTypes.map((t) => ({
                    id: t.id,
                    label: t.name
                  }))
                ]}
                value={filterType === '' ? '' : Number(filterType)}
                onChange={(val) => setFilterType(val === '' ? '' : String(val))}
                placeholder="All Leave Types"
              />
            </div>

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
              <div className="w-48">
                <SearchableSelect
                  options={[
                    { id: '', label: 'All Departments' },
                    ...departments.map((d: Department) => ({
                      id: d.id,
                      label: d.name
                    }))
                  ]}
                  value={filterDept === '' ? '' : Number(filterDept)}
                  onChange={(val) => setFilterDept(val === '' ? '' : String(val))}
                  placeholder="All Departments"
                />
              </div>
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
                            {canTLApprove && overallPend && tlStatus === 'pending' && leave.employee_id !== user?.employee_id && (
                              <button
                                onClick={() => tlApprove(leave.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Team Lead Approve"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {canTLReject && overallPend && tlStatus === 'pending' && leave.employee_id !== user?.employee_id && (
                              <button
                                onClick={() => setRejectModal({ leave, mode: 'teamlead' })}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors"
                                title="Team Lead Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            )}

                            {/* ── HR/Admin final approve ── */}
                            {canHRApprove && leave.status !== 'approved' && (tlApproved || tlRejected) && leave.employee_id !== user?.employee_id && (
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
                            {canHRReject && leave.status === 'pending' && tlApproved && leave.employee_id !== user?.employee_id && (
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
        </>
      )}

      {/* Modals */}
      {applyOpen && (
        <ApplyLeaveModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          currentEmployeeId={user?.employee_id ?? undefined}
          isAdmin={isAdmin}
        />
      )}
      <RejectModal
        leave={rejectModal?.leave ?? null}
        mode={rejectModal?.mode ?? 'hr'}
        onClose={() => setRejectModal(null)}
      />
      <LeaveTypeModal
        open={leaveTypeModalOpen}
        onClose={() => setLeaveTypeModalOpen(false)}
        leaveType={selectedLeaveType}
      />
    </div>
  );
}