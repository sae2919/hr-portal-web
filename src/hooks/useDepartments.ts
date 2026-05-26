import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import api from '@/lib/api';

export const useDepartments = (params?: {
  page?: number;
  search?: string;
  status?: string;
}) => {

  return useQuery({

    queryKey: [
      'departments',
      params,
    ],

    queryFn: async () => {

      const response =
        await api.get(
          '/v1/departments',
          {
            params: {
              ...params,
              page:
                params?.page || 1,
              per_page: 10,
            },
          }
        );

      return response.data;
    },
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