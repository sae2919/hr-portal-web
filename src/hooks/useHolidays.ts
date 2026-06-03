import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Holiday, CreateHolidayPayload } from '@/types/holiday';

const KEY = 'holidays';

export const useHolidays = (params?: { year?: number; month?: number }) => {
  const year = params?.year ?? new Date().getFullYear();
  const month = params?.month ?? (new Date().getMonth() + 1);

  return useQuery<{ year: number; month: number; data: Holiday[] }>({
    queryKey: [KEY, year, month],
    queryFn: () =>
      api
        .get('/holidays', {
          params: { year, month },
        })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHolidayPayload) =>
      api.post('/holidays', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Holiday created successfully');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.errors
          ? Object.values(error.response.data.errors).flat()[0]
          : error?.response?.data?.message || 'Failed to create holiday';
      toast.error(msg as string);
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateHolidayPayload>) =>
      api.put(`/holidays/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Holiday updated successfully');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.errors
          ? Object.values(error.response.data.errors).flat()[0]
          : error?.response?.data?.message || 'Failed to update holiday';
      toast.error(msg as string);
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/holidays/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete holiday';
      toast.error(msg);
    },
  });
};
