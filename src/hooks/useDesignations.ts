import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Designation,
  StoreDesignationPayload,
  UpdateDesignationPayload
} from '@/types/designation';

const KEY = 'designations';

export const useDesignations = (params?: {
  page?: number;
  search?: string;
  status?: string;
  department_id?: number;
}) => {

  return useQuery({
    
    queryKey: [KEY, params],

    queryFn: async () => {

      const response = await api.get(
        '/v1/designations',
        {
          params: {
            ...params,
            page: params?.page || 1,
            per_page: 10,
          },
        }
      );

      return response.data;
    },

    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateDesignation = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      data: StoreDesignationPayload
    ) => {

      const response =
        await api.post(
          '/designations',
          data
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [KEY],
      });

      toast.success(
        'Designation created successfully'
      );
    },

    onError: (error: any) => {

      const msg =
        error?.response?.data?.errors
          ? Object.values(
              error.response.data.errors
            ).flat()[0]
          : error?.response?.data?.message ||
            'Failed to create designation';

      toast.error(msg as string);
    },
  });
};

export const useUpdateDesignation = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      id,
      ...data
    }: UpdateDesignationPayload) => {

      const response =
        await api.put(
          `/designations/${id}`,
          data
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [KEY],
      });

      toast.success(
        'Designation updated successfully'
      );
    },

    onError: (error: any) => {

      const msg =
        error?.response?.data?.errors
          ? Object.values(
              error.response.data.errors
            ).flat()[0]
          : error?.response?.data?.message ||
            'Failed to update designation';

      toast.error(msg as string);
    },
  });
};

export const useDeleteDesignation = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      id: number
    ) => {

      const response =
        await api.delete(
          `/designations/${id}`
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [KEY],
      });

      toast.success(
        'Designation deleted successfully'
      );
    },

    onError: (error: any) => {

      toast.error(
        error?.response?.data?.message ||
        'Failed to delete designation'
      );
    },
  });
};