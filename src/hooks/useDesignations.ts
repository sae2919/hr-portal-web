import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Designation, StoreDesignationPayload, UpdateDesignationPayload } from '@/types/designation';

const KEY = 'designations';

export const useDesignations = (params?: {
  search?: string;
  status?: string;
  department_id?: number;
}) => {
  return useQuery<Designation[]>({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get('/designations', { params }).then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreDesignationPayload) =>
      api.post('/designations', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Designation created successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to create designation';
      toast.error(msg as string);
    },
  });
};

export const useUpdateDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDesignationPayload) =>
      api.put(`/designations/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Designation updated successfully');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error?.response?.data?.message || 'Failed to update designation';
      toast.error(msg as string);
    },
  });
};

export const useDeleteDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/designations/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Designation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to delete designation'
      );
    },
  });
};