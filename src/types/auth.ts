export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  role: string;
  roles: string[];
  permissions: string[];
  employee_id: number | null;
  employee: {
    id: number;
    employee_code: string;
    full_name: string;
    photo: string | null;
    department: string | null;
    designation: string | null;
  } | null;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}