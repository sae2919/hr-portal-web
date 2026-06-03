import api from '@/lib/api';

export interface SalaryRevision {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    department?: { name: string } | string;
    designation?: { name: string } | string;
  } | null;
  old_basic_salary: number;
  old_hra: number;
  old_allowances: number;
  old_bonus: number;
  old_gross_salary: number;
  old_net_salary: number;
  new_basic_salary: number;
  new_hra: number;
  new_allowances: number;
  new_bonus: number;
  new_gross_salary: number;
  new_net_salary: number;
  increment_percentage: number;
  effective_date: string;
  reason: string;
  approved_by?: number;
  approver?: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

export const salaryRevisionService = {
  getRevisions: async (params?: { page?: number; per_page?: number; employee_id?: number }) => {
    const response = await api.get('/salary-revisions', { params });
    return response.data;
  },

  createRevision: async (data: {
    employee_id: number;
    new_basic_salary: number;
    new_hra: number;
    new_allowances: number;
    new_bonus: number;
    effective_date: string;
    reason: string;
  }) => {
    const response = await api.post('/salary-revisions', data);
    return response.data;
  },

  downloadRevisionPdf: async (id: number, employeeCode: string, dateStr: string) => {
    const response = await api.get(`/salary-revisions/${id}/download`, {
      responseType: 'blob',
    });
    
    // Create a local blob URL and trigger file download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salary-revision-${employeeCode}-${dateStr}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
