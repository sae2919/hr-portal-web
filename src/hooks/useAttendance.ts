import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Attendance, StoreAttendancePayload, MonthlyReportItem } from '@/types/attendance';

const KEY = 'attendance';

export const useAttendance = (params?: {
  date?: string;
  month?: number;
  year?: number;
  employee_id?: number;
  status?: string;
  department_id?: number;
}) => {
  return useQuery<Attendance[]>({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get('/attendance', { params }).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });
};

export const useMonthlyReport = (month: number, year: number) => {
  return useQuery<{ month: number; year: number; data: MonthlyReportItem[] }>({
    queryKey: ['attendance-report', month, year],
    queryFn: () =>
      api.get('/attendance/report/monthly', { params: { month, year } })
         .then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
};

export const useSaveAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreAttendancePayload) =>
      api.post('/attendance', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Attendance saved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save attendance');
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<StoreAttendancePayload> & { id: number }) =>
      api.put(`/attendance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Attendance updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update attendance');
    },
  });
};

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/attendance/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Attendance deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    },
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employee_id: number) =>
      api.post('/attendance/checkin', { employee_id }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-in failed');
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employee_id: number) =>
      api.post('/attendance/checkout', { employee_id }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-out failed');
    },
  });
};