export interface LeaveType {
  id: number;
  name: string;
  code: string;
  days_per_year: number;
  carry_forward: boolean;
  is_paid: boolean;
  color: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Leave {
  id: number;
  employee_id: number;
  employee: {
    id: number;
    full_name: string;
    employee_code: string;
    department: string | null;
  } | null;
  leave_type_id: number;
  leave_type: {
    id: number;
    name: string;
    color: string;
  } | null;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  approved_by: number | null;
  approved_at: string | null;
  team_lead_status: 'pending' | 'approved' | 'rejected' | null;
  team_lead_rejection_reason: string | null;
  team_lead_acted_at: string | null;
  team_lead: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type: {
    id: number;
    name: string;
    color: string;
  } | null;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface ApplyLeavePayload {
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason: string;
}