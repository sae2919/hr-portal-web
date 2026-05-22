export interface Attendance {
  id: number;
  employee_id: number;
  employee: {
    id: number;
    full_name: string;
    employee_code: string;
    department: string | null;
  } | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday';
  overtime_hours: number;
  note: string | null;
  created_at: string;
}

export interface StoreAttendancePayload {
  employee_id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  overtime_hours?: number;
  note?: string;
}

export interface MonthlyReportItem {
  employee_id: number;
  employee_code: string;
  full_name: string;
  department: string | null;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total_days: number;
  overtime_hours: number;
}