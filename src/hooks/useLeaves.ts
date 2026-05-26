import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Leave, LeaveType, LeaveBalance, ApplyLeavePayload } from '@/types/leave';

// ── Pagination Response Interface ───────────────────────────
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

// ── FIXED: Added /v1 prefix and updated parsing to handle resource array wrappers ──
export const useLeaveTypes = () => {
  return useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/v1/leave-types').then((r) => {
      // Handles both direct array inputs or wrapped JSON objects safely
      return Array.isArray(r.data) ? r.data : r.data?.data ?? [];
    }),
    staleTime: 5 * 60 * 1000,
  });
};

// ── useLeaves with Paginated Metrics ────────────────
export const useLeaves = (params?: {
  page?: number;         
  per_page?: number;     
  status?: string;
  employee_id?: number;
  department_id?: number;
  leave_type_id?: number;
}) => {
  return useQuery<PaginatedResponse<Leave>>({
    queryKey: [KEY, params],
    queryFn: () => 
      api.get('/v1/leaves', { 
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? 10,
          status: params?.status,
          employee_id: params?.employee_id,
          department_id: params?.department_id,
          leave_type_id: params?.leave_type_id,
        }
      }).then((r) => r.data), 
    staleTime: 60 * 1000,
  });
};

// ── FIXED: Added /v1 prefix ──
export const useLeaveBalances = (employee_id: number, year?: number) => {
  return useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', employee_id, year],
    queryFn: () =>
      api.get('/v1/leave-balances', { params: { employee_id, year } })
         .then((r) => Array.isArray(r.data) ? r.data : r.data?.data ?? []),
    enabled: !!employee_id,
  });
};

// ── FIXED: Added /v1 prefix ──
export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyLeavePayload) =>
      api.post('/v1/leaves', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave application submitted');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to apply leave';
      toast.error(msg as string);
    },
  });
};

// ── FIXED: Added /v1 prefix ──
export const useApproveLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch(`/v1/leaves/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave approved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve');
    },
  });
};

// ── FIXED: Added /v1 prefix ──
export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejection_reason }: { id: number; rejection_reason: string }) =>
      api.patch(`/v1/leaves/${id}/reject`, { rejection_reason }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject');
    },
  });
};

// ── FIXED: Added /v1 prefix ──
export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/v1/leaves/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    },
  });
};