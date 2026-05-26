import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Employee, StoreEmployeePayload } from '@/types/employee';

const KEY = 'employees';

export const useEmployees = (params?: {
  search?: string;
  department_id?: number;
  status?: string;
  employment_type?: string;
}) => {
  return useQuery<Employee[]>({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get('/v1/employees', { params }).then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
};

export const useEmployee = (id: number) => {
  return useQuery<Employee>({
    queryKey: [KEY, id],
    queryFn: () =>
      api.get(`/employees/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreEmployeePayload) =>
      api.post('/employees', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Employee created successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to create employee';
      toast.error(msg as string);
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: StoreEmployeePayload & { id: number }) =>
      api.put(`/employees/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Employee updated successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to update employee';
      toast.error(msg as string);
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/employees/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Employee deleted successfully');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to delete employee'
      );
    },
  });
};