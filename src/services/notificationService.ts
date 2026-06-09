import api from '@/lib/api';

export interface Notification {
  id: string;
  type: 'leave_request' | 'leave_status' | 'birthday' | 'anniversary' | 'attendance' | 'payroll';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: 'calendar' | 'check' | 'x' | 'cake' | 'star' | 'alert' | 'rupee';
  color: 'orange' | 'green' | 'red' | 'pink' | 'yellow' | 'blue';
  url?: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  count: number;
}

export const notificationService = {
  getAll: async (): Promise<NotificationResponse> => {
    try {
      const response = await api.get('/notifications', { timeout: 20000 });
      return response.data;
    } catch (error) {
      console.warn('Notifications unavailable');
      return { success: false, data: [], count: 0 };
    }
  },
};