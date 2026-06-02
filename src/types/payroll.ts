export interface Payroll {
  id: number;
  employee_id: number;
  month: number;
  year: number;
  basic_salary: string;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  lop_days: number;
  lop_deduction: string;
  working_days: number;
  present_days: number;
  status: 'pending' | 'processed' | 'paid';
  paid_at: string | null;
  salary_structure_id: number | null;
  created_at: string;
  updated_at: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id?: string;
    department?: { name: string };
    designation?: { name: string };
  };
}

export interface PayrollItem {
  id: number;
  payroll_id: number;
  name: string;
  type: 'earning' | 'deduction';
  amount: string;
}

export interface PayslipRequest {
  id: number;
  payroll_id: number;
  employee_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    department?: { name: string };
  };
  payroll: {
    id: number;
    month: number;
    year: number;
    gross_salary: string;
    total_deductions: string;
    net_salary: string;
    status: string;
  };
}

export interface GeneratePayrollPayload {
  employee_id: number;
  month: number;
  year: number;
  include_pf?: boolean;
  include_pt?: boolean;
  pf_percentage?: number;
  pt_amount?: number;
}

export interface PayrollPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}