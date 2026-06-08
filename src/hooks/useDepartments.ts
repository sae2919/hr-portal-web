import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import api from '@/lib/api';

export const useDepartments = (
  params?: {
    page?: number;
    search?: string;
    status?: string;
    per_page?: number;
  },
  options?: { enabled?: boolean }
) => {

  return useQuery({

    queryKey: [
      'departments',
      // Normalise undefined params so all "load all" callers share the same cache key
      params ?? null,
    ],

    queryFn: async () => {

      const response =
        await api.get(
          '/departments',
          {
            params: {
              ...params,
              page:
                params?.page || 1,
              per_page: params?.per_page || 100,
            },
          }
        );

      return response.data;
    },

    // Explicit cache settings — departments rarely change
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime:    10 * 60 * 1000, // keep in cache 10 minutes
    ...options,
  });
};


export const useCreateDepartment = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      data: any
    ) => {

      const response =
        await api.post(
          '/departments',
          data
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [
          'departments',
        ],
      });
    },
  });
};

export const useUpdateDepartment = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      id,
      ...data
    }: any) => {

      const response =
        await api.put(
          `/departments/${id}`,
          data
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [
          'departments',
        ],
      });
    },
  });
};

export const useDeleteDepartment = () => {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      id: number
    ) => {

      const response =
        await api.delete(
          `/departments/${id}`
        );

      return response.data;
    },

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: [
          'departments',
        ],
      });
    },
  });
};