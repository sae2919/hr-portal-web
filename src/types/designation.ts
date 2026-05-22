export interface Designation {
  id: number;
  title: string;
  code: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  department_id: number | null;
  department: { id: number; name: string } | null;
  employee_count: number;
  created_at: string;
}

export interface StoreDesignationPayload {
  title: string;
  code?: string;
  description?: string;
  status: 'active' | 'inactive';
  department_id?: number | null;
}

export interface UpdateDesignationPayload extends StoreDesignationPayload {
  id: number;
}