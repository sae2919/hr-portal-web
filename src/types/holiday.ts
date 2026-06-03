export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description: string | null;
  is_recurring: boolean;
}

export interface CreateHolidayPayload {
  name: string;
  date: string;
  type: 'public' | 'optional' | 'restricted';
  description?: string;
  is_recurring: boolean;
}
