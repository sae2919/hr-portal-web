import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { toast } from 'sonner';
import api from '@/lib/api';

import {
  Attendance,
  StoreAttendancePayload,
  MonthlyReportItem,
} from '@/types/attendance';

const KEY = 'attendance';

export interface WorksheetItem {
  employee_id:    number;
  name:           string;
  department:     string;
  check_in:       string;
  check_out:      string;
  status:         'present' | 'absent' | 'late' | 'half_day' | 'holiday';
  overtime_hours: number;
  note:           string;
  is_saved:       boolean;
  selected?:      boolean;
}

export interface BulkStorePayload {
  date: string;
  records: Array<{
    employee_id:    number;
    check_in:       string | null;
    check_out:      string | null;
    status:         'present' | 'absent' | 'late' | 'half_day' | 'holiday';
    overtime_hours?: number;
    note?:          string | null;
  }>;
}

export const useAttendance = (params?: {
  page?:          number;
  date?:          string;
  month?:         number;
  year?:          number;
  employee_id?:   number;
  status?:        string;
  department_id?: number;
}) => {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const response = await api.get('/attendance', {
        params: {
          ...params,
          page:     params?.page || 1,
          per_page: 10,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
};

// ── Updated: accepts optional employeeId to scope to a single employee ─────────
export const useMonthlyReport = (month: number, year: number, employeeId?: number) => {
  return useQuery<{
    month: number;
    year:  number;
    data:  MonthlyReportItem[];
  }>({
    queryKey: ['attendance-report', month, year, employeeId],   // employeeId in key so it re-fetches correctly
    queryFn: async () => {
      const response = await api.get('/attendance/report/monthly', {
        params: {
          month,
          year,
          ...(employeeId ? { employee_id: employeeId } : {}),   // only send if present
        },
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useSaveAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StoreAttendancePayload) => {
      const response = await api.post('/attendance', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
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
    mutationFn: async ({ id, ...data }: Partial<StoreAttendancePayload> & { id: number }) => {
      const response = await api.put(`/attendance/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
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
    mutationFn: async (id: number) => {
      const response = await api.delete(`/attendance/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
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
    mutationFn: async (employee_id: number) => {
      const response = await api.post('/attendance/checkin', { employee_id });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
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
    mutationFn: async (employee_id: number) => {
      const response = await api.post('/attendance/checkout', { employee_id });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-out failed');
    },
  });
};

// ── Updated: accepts optional employee_id to scope worksheet to one employee ───
export const useWorksheet = (params: {
  date:          string;
  page:          number;
  per_page?:     number;
  employee_id?:  number;              // ← new: passed for non-admin users
}) => {
  return useQuery<{
    data:         WorksheetItem[];
    current_page: number;
    last_page:    number;
    total:        number;
  }>({
    queryKey: ['attendance-worksheet', params],   // employee_id is part of params so cache is scoped
    queryFn: async () => {
      const response = await api.get('/attendance/worksheet', {
        params: {
          date:     params.date,
          page:     params.page,
          per_page: params.per_page || 10,
          ...(params.employee_id ? { employee_id: params.employee_id } : {}),  // only send if present
        },
      });
      return response.data;
    },
    staleTime: 30 * 1000,
  });
};

export const useSaveBulkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkStorePayload) => {
      const response = await api.post('/attendance/bulk-store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-worksheet'] });
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(data.message || 'Bulk attendance records synced successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save batch sheet modifications');
    },
  });
};

export const getAttendanceRecords = (attendanceResponse: any): Attendance[] => {
  return Array.isArray(attendanceResponse?.data) ? attendanceResponse.data : [];
};

export const getAttendanceMeta = (attendanceResponse: any) => {
  return attendanceResponse?.meta;
};