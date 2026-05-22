export interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  parent_id: number | null;
  parent: { id: number; name: string } | null;
  employee_count: number;
  created_at: string;
}

export interface StoreDepartmentPayload {
  name: string;
  code?: string;
  description?: string;
  status: 'active' | 'inactive';
  parent_id?: number | null;
}

export interface UpdateDepartmentPayload extends StoreDepartmentPayload {
  id: number;
}