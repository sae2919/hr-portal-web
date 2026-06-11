import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { MailTemplate, StoreMailTemplatePayload, UpdateMailTemplatePayload } from '@/types/mailTemplate';

export const useMailTemplates = (params?: { search?: string; type?: string }) => {
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

const buildFormData = (data: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (key === 'pdf_fields') {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    } else if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

export const useCreateMailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StoreMailTemplatePayload) => {
      const isMultipart = !!data.pdf_file;
      const payload = isMultipart ? buildFormData(data) : data;
      const headers = isMultipart ? { 'Content-Type': 'multipart/form-data' } : {};
      const response = await api.post('/mail-templates', payload, { headers });
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
      const isMultipart = !!data.pdf_file;
      if (isMultipart) {
        const formData = buildFormData(data);
        formData.append('_method', 'PUT');
        const response = await api.post(`/mail-templates/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } else {
        const response = await api.put(`/mail-templates/${id}`, data);
        return response.data;
      }
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
