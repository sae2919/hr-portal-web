import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Leave, LeaveType, LeaveBalance, ApplyLeavePayload } from '@/types/leave';

const KEY = 'leaves';

export const useLeaveTypes = () => {
  return useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leave-types').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
};

export const useLeaves = (params?: {
  status?: string;
  employee_id?: number;
  department_id?: number;
  leave_type_id?: number;
}) => {
  return useQuery<Leave[]>({
    queryKey: [KEY, params],
    queryFn: () => api.get('/leaves', { params }).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });
};

export const useLeaveBalances = (employee_id: number, year?: number) => {
  return useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', employee_id, year],
    queryFn: () =>
      api.get('/leave-balances', { params: { employee_id, year } })
         .then((r) => r.data.data),
    enabled: !!employee_id,
  });
};

export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyLeavePayload) =>
      api.post('/leaves', data).then((r) => r.data),
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

export const useApproveLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch(`/leaves/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Leave approved');
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