import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Leave, LeaveType, LeaveBalance, ApplyLeavePayload, GroupedEmployeeLeaveBalances } from '@/types/leave';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const KEY = 'leaves';

export const useLeaveTypes = (options?: { enabled?: boolean }) =>
  useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () =>
      api.get('/leave-types').then((r) =>
        Array.isArray(r.data) ? r.data : r.data?.data ?? []
      ),
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useLeaves = (
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
    employee_id?: number;
    department_id?: number;
    leave_type_id?: number;
    team_lead_status?: string;
  },
  options?: { enabled?: boolean }
) =>
  useQuery<PaginatedResponse<Leave>>({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get('/leaves', {
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? 10,
          status: params?.status,
          employee_id: params?.employee_id,
          department_id: params?.department_id,
          leave_type_id: params?.leave_type_id,
          team_lead_status: params?.team_lead_status,
        },
      }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useLeaveBalances = (
  employee_id: number,
  year?: number,
  options?: { enabled?: boolean }
) =>
  useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', employee_id, year],
    queryFn: () =>
      api
        .get('/leave-balances', { params: { employee_id, year, per_page: 50 } })
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
    enabled: !!employee_id && (options?.enabled !== false),
    ...options,
  });

export const useAllLeaveBalances = (
  params?: {
    page?: number;
    per_page?: number;
    employee_id?: number | string;
    year?: number;
    search?: string;
    department_id?: number;
    leave_type_id?: number;
  },
  options?: { enabled?: boolean }
) =>
  useQuery<PaginatedResponse<GroupedEmployeeLeaveBalances>>({
    queryKey: ['all-leave-balances', params],
    queryFn: () =>
      api
        .get('/leave-balances', {
          params: {
            page: params?.page ?? 1,
            per_page: params?.per_page ?? 10,
            employee_id: params?.employee_id,
            year: params?.year,
            search: params?.search,
            department_id: params?.department_id,
            leave_type_id: params?.leave_type_id,
          },
        })
        .then((r) => r.data),
    staleTime: 30 * 1000,
    ...options,
  });

export const useCreateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<LeaveType, 'id' | 'created_at'>) =>
      api.post('/leave-types', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success('Leave type created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create leave type');
    },
  });
};

export const useUpdateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<LeaveType> & { id: number }) =>
      api.put(`/leave-types/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-balances'] });
      toast.success('Leave type updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update leave type');
    },
  });
};

export const useDeleteLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/leave-types/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-balances'] });
      toast.success('Leave type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete leave type');
    },
  });
};

export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyLeavePayload) =>
      api.post('/leaves', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave application submitted — awaiting team lead review');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.errors
          ? Object.values(error.response.data.errors).flat()[0]
          : error?.response?.data?.message || 'Failed to apply leave';
      toast.error(msg as string);
    },
  });
};

// ── Team Lead Approve ──────────────────────────────────────────
export const useTeamLeadApprove = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch(`/leaves/${id}/team-lead-approve`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Team lead approved — awaiting HR/Admin final approval');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve');
    },
  });
};

// ── Team Lead Reject ───────────────────────────────────────────
export const useTeamLeadReject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejection_reason }: { id: number; rejection_reason: string }) =>
      api.patch(`/leaves/${id}/team-lead-reject`, { rejection_reason }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Team lead rejected the leave');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject');
    },
  });
};

// ── HR/Admin Final Approve (can override TL rejection) ─────────
export const useApproveLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch(`/leaves/${id}/approve`).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(data?.message ?? 'Leave approved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve');
    },
  });
};

export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejection_reason }: { id: number; rejection_reason: string }) =>
      api.patch(`/leaves/${id}/reject`, { rejection_reason }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject');
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/leaves/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    },
  });
};

export interface MonthLeave {
  leave_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  employee_name: string;
  department: string | null;
  leave_type: string;
}

export const useMonthLeaves = (params?: { year?: number; month?: number }) => {
  const year = params?.year ?? new Date().getFullYear();
  const month = params?.month ?? (new Date().getMonth() + 1);

  return useQuery<{ year: number; month: number; data: MonthLeave[] }>({
    queryKey: ['month-leaves', year, month],
    queryFn: () =>
      api
        .get('/attendance/month-leaves', {
          params: { year, month },
        })
        .then((r) => r.data),
    staleTime: 60 * 1000,
  });
};