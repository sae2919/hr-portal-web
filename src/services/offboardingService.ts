import api from '@/lib/api';

export interface OffboardingRequest {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string | null;
    department?: { name: string } | string | null;
    designation?: { title: string } | string | null;
  } | null;
  resignation_date: string;
  last_working_day: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejection_reason?: string;
  tasks: Array<{
    id: number;
    task_name: string;
    status: 'pending' | 'completed';
  }>;
  approved_by?: number;
  approver?: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

export const offboardingService = {
  getRequests: async (params?: { page?: number; per_page?: number; status?: string; search?: string }) => {
    const response = await api.get('/offboarding', { params });
    return response.data;
  },

  createRequest: async (data: {
    employee_id?: number;
    resignation_date: string;
    last_working_day?: string;
    reason: string;
  }) => {
    const response = await api.post('/offboarding', data);
    return response.data;
  },

  approveRequest: async (id: number, data: { last_working_day: string }) => {
    const response = await api.post(`/offboarding/${id}/approve`, data);
    return response.data;
  },

  rejectRequest: async (id: number, data: { rejection_reason: string }) => {
    const response = await api.post(`/offboarding/${id}/reject`, data);
    return response.data;
  },

  completeRequest: async (id: number) => {
    const response = await api.post(`/offboarding/${id}/complete`);
    return response.data;
  },

  updateTasks: async (id: number, tasks: OffboardingRequest['tasks']) => {
    const response = await api.patch(`/offboarding/${id}/tasks`, { tasks });
    return response.data;
  },
};
