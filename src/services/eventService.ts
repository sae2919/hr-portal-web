import api from '@/lib/api';

export interface Event {
  id: number;
  title: string;
  description?: string;
  type: 'holiday' | 'birthday' | 'company_event' | 'meeting' | 'training' | 'other';
  event_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  color: string;
  icon?: string;
  status: string;
}

export interface Birthday {
  id: number;
  employee_id?: number;
  name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  department?: string;
  designation?: string;
}

export interface Anniversary {
  id: number;
  employee_id?: number;
  name: string;
  first_name: string;
  last_name: string;
  joining_date: string;
  years_of_service: number;
  department?: string;
  designation?: string;
}

export interface TodaySpecial {
  birthdays: Birthday[];
  anniversaries: Anniversary[];
}

// ─── Wish / Comment types ─────────────────────────────────────────────────────

export interface Wish {
  id: number;
  employee_id: number;        // who is being wished
  sender_id: number;          // who sent the wish
  sender_name: string;
  sender_avatar?: string;
  wish_type: 'birthday' | 'anniversary';
  message: string;
  emoji?: string;
  created_at: string;
}

export interface WishPayload {
  employee_id: number;
  wish_type: 'birthday' | 'anniversary';
  message: string;
  emoji?: string;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
const fallbackEvents: Event[] = [];

// ─── Service ──────────────────────────────────────────────────────────────────
export const eventService = {

  // ── Events ──────────────────────────────────────────────────────────────────

  getEvents: async (params?: { month?: number; year?: number; start_date?: string; end_date?: string }) => {
    try {
      const response = await api.get('/events', { params, timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return { success: true, data: fallbackEvents };
    }
  },

  getUpcomingEvents: async () => {
    try {
      const response = await api.get('/events/upcoming', { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error);
      return { success: true, data: [] };
    }
  },

  getTodaySpecial: async (): Promise<{ success: boolean; data: TodaySpecial }> => {
    try {
      const response = await api.get('/events/today-special', { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch today special:', error);
      return { success: true, data: { birthdays: [], anniversaries: [] } };
    }
  },

  getUpcomingBirthdays: async (days: number = 30) => {
    try {
      const response = await api.get('/events/upcoming-birthdays', { params: { days }, timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch upcoming birthdays:', error);
      return { success: true, data: [] };
    }
  },

  createEvent: async (data: Partial<Event>) => {
    const response = await api.post('/events', data);
    return response.data;
  },

  updateEvent: async (id: number, data: Partial<Event>) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  deleteEvent: async (id: number) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  // ── Wishes / Comments ────────────────────────────────────────────────────────

  // Fetch all wishes for a specific employee (birthday or anniversary)
  getWishes: async (employeeId: number, wishType: 'birthday' | 'anniversary'): Promise<{ success: boolean; data: Wish[] }> => {
    try {
      const response = await api.get(`/events/wishes/${employeeId}`, {
        params: { wish_type: wishType },
        timeout: 8000,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch wishes:', error);
      return { success: true, data: [] };
    }
  },

  // Send a wish
  sendWish: async (payload: WishPayload): Promise<{ success: boolean; data?: Wish; message?: string }> => {
    try {
      const response = await api.post('/events/wishes', payload);
      return response.data;
    } catch (error: any) {
      console.error('Failed to send wish:', error);
      return { success: false, message: error?.response?.data?.message || 'Failed to send wish' };
    }
  },

  // Delete a wish (sender or admin only)
  deleteWish: async (wishId: number): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/events/wishes/${wishId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete wish:', error);
      return { success: false };
    }
  },
};