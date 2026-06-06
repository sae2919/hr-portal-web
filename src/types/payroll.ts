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
    joining_date?: string;
    bank_name?: string;
    bank_account_number?: string;
    pan_number?: string;
    department?: { name: string };
    designation?: { title?: string; name?: string };
  };
}

export interface PayrollItem {
  id: number;
  payroll_id: number;
  name: string;
  type: 'earning' | 'deduction';
  amount: string;
}



export interface GeneratePayrollPayload {
  employee_id: number | 'all';
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