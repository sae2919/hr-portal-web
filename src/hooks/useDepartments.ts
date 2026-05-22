import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Department, StoreDepartmentPayload, UpdateDepartmentPayload } from '@/types/department';

const KEY = 'departments';

export const useDepartments = (params?: { search?: string; status?: string }) => {
  return useQuery<Department[]>({
    queryKey: [KEY, params],
    queryFn: () => api.get('/departments', { params }).then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
};

export const useDepartment = (id: number) => {
  return useQuery<Department>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/departments/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreDepartmentPayload) =>
      api.post('/departments', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Department created successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to create department';
      toast.error(msg as string);
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDepartmentPayload) =>
      api.put(`/departments/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Department updated successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to update department';
      toast.error(msg as string);
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/departments/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Department deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete department');
    },
  });
};