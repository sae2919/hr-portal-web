import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { MailTemplate, StoreMailTemplatePayload, UpdateMailTemplatePayload } from '@/types/mailTemplate';

export const useMailTemplates = (params?: { search?: string }) => {
  return useQuery<MailTemplate[]>({
    queryKey: ['mail-templates', params],
    queryFn: async () => {
      const response = await api.get('/mail-templates', {
        params,
      });
      return response.data;
    },
  });
};

export const useCreateMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StoreMailTemplatePayload) => {
      const response = await api.post('/mail-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['mail-templates'],
      });
    },
  });
};

export const useUpdateMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMailTemplatePayload) => {
      const response = await api.put(`/mail-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['mail-templates'],
      });
    },
  });
};

export const useDeleteMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/mail-templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['mail-templates'],
      });
    },
  });
};
