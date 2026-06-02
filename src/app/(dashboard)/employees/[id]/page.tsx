'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '@/types/employee';
import { Department } from '@/types/department';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  ArrowLeft, Pencil, Loader2, AlertCircle, User, Mail, Phone,
  Calendar, Building2, Briefcase, FileText, CreditCard,
  Banknote, Shield, Heart, MapPin, Home, FileBadge, Eye,
  CheckCircle, XCircle, Copy, ExternalLink
} from 'lucide-react';

// ── Helper Functions ─────────────────────────────────────────────
const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const avatarColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-slate-50 text-slate-600 border-slate-200',
  terminated: 'bg-red-50 text-red-700 border-red-200',
};

const empTypeLabels: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

// ── Section Card Component ───────────────────────────────────────
function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: any; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-400" />
          <span className="font-medium text-slate-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Detail Row Component ─────────────────────────────────────────
function DetailRow({ label, value, copyable = false }: { label: string; value: React.ReactNode; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-400 w-1/3">{label}</span>
      <div className="flex items-center gap-2 w-2/3 justify-end">
        <span className="text-sm font-medium text-slate-700 text-right">{value || '—'}</span>
        {copyable && value && typeof value === 'string' && (
          <button
            onClick={() => handleCopy(value)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Detail Page Component ───────────────────────────────────
export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;
  const { hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch employee data
  const { data: employee, isLoading, error } = useQuery<any>({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const res = await api.get(`/employees/${employeeId}`);
      return res.data.data;
    },
    enabled: !!employeeId,
  });

  // Fetch department & designation details
  const { data: deptData } = useQuery({
    queryKey: ['department', employee?.department_id],
    queryFn: async () => {
      if (!employee?.department_id) return null;
      const res = await api.get(`/departments/${employee.department_id}`);
      return res.data.data;
    },
    enabled: !!employee?.department_id,
  });

  const { data: desigData } = useQuery({
    queryKey: ['designation', employee?.designation_id],
    queryFn: async () => {
      if (!employee?.designation_id) return null;
      const res = await api.get(`/designations/${employee.designation_id}`);
      return res.data.data;
    },
    enabled: !!employee?.designation_id,
  });

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-slate-600">Employee not found</p>
        <Link href="/employees" className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Back to Employees
        </Link>
      </div>
    );
  }

  const canEdit = hasPermission('edit employees');

  // Salary calculations
  const grossSalary = (employee.basic_salary || 0) + (employee.hra || 0) + (employee.allowances || 0) + (employee.bonus || 0);
  const totalDeductions = (employee.pf_deduction || 0) + (employee.esi_employee || 0) + (employee.pt_amount || 0) + (employee.tds_amount || 0) + (employee.other_deductions || 0);
  const netSalary = grossSalary - totalDeductions;
  const annualCTC = (employee.ctc || 0) || (netSalary * 12) + (employee.esi_employer || 0) * 12;

  const ptStateInfo = employee.pt_state ? PT_STATES.find(s => s.value === employee.pt_state) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/employees" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${avatarColors[employee.id % avatarColors.length]} rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-lg font-semibold">{getInitials(employee.full_name)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{employee.full_name}</h2>
              <p className="text-sm text-slate-400">
                {employee.employee_code} • {empTypeLabels[employee.employment_type]} •{' '}
                <Badge variant="outline" className={statusColors[employee.status]}>{employee.status}</Badge>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/employees/${employeeId}/edit`}>
              <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-500 text-white gap-1.5">
                <Pencil size={14} /> Edit Profile
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
            <Eye size={14} /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal & Documents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <SectionCard title="Personal Information" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Full Name" value={employee.full_name} />
              <DetailRow label="Email" value={employee.email} copyable />
              <DetailRow label="Phone" value={employee.phone} copyable />
              <DetailRow label="Gender" value={employee.gender} />
              <DetailRow label="Blood Group" value={employee.blood_group} />
              <DetailRow label="Date of Birth" value={formatDate(employee.dob)} />
              <DetailRow label="Country" value={employee.country} />
              <DetailRow label="State" value={employee.state} />
              <DetailRow label="City" value={employee.city} />
              <DetailRow label="Pincode" value={employee.pincode} copyable />
              <div className="md:col-span-2">
                <DetailRow label="Address" value={employee.address} />
              </div>
            </div>
          </SectionCard>

          {/* Identity Documents */}
          <SectionCard title="Identity Documents" icon={FileBadge}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="PAN" value={employee.pan_number?.toUpperCase()} copyable />
              <DetailRow label="Aadhaar" value={employee.aadhaar_number ? employee.aadhaar_number.replace(/(\d{4})/g, '$1 ').trim() : null} copyable />
              <DetailRow label="Driving License" value={employee.driving_license} copyable />
              <DetailRow label="Passport" value={employee.passport_number} copyable />
              <DetailRow label="Voter ID" value={employee.voter_id} copyable />
              <DetailRow label="UAN (EPF)" value={employee.uan_number} copyable />
            </div>
          </SectionCard>

          {/* Employment Details */}
          <SectionCard title="Employment Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Department" value={deptData?.name || '—'} />
              <DetailRow label="Designation" value={desigData?.title || '—'} />
              <DetailRow label="Reporting To" value={employee.manager?.full_name || '—'} />
              <DetailRow label="Employee Code" value={employee.employee_code} copyable />
              <DetailRow label="Joining Date" value={formatDate(employee.joining_date)} />
              <DetailRow label="Exit Date" value={formatDate(employee.exit_date)} />
              <DetailRow label="Employment Type" value={empTypeLabels[employee.employment_type]} />
              <DetailRow label="Status" value={
                <Badge variant="outline" className={statusColors[employee.status]}>{employee.status}</Badge>
              } />
            </div>
          </SectionCard>

          {/* Emergency Contact */}
          <SectionCard title="Emergency Contact" icon={Heart}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailRow label="Name" value={employee.emergency_contact_name} />
              <DetailRow label="Phone" value={employee.emergency_contact_phone} copyable />
              <DetailRow label="Relationship" value={employee.emergency_contact_relation} />
            </div>
          </SectionCard>

          {/* Bank Details */}
          <SectionCard title="Bank Details" icon={CreditCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Bank Name" value={employee.bank_name} />
              <DetailRow label="Account Number" value={employee.bank_account_number} copyable />
              <DetailRow label="IFSC Code" value={employee.bank_ifsc?.toUpperCase()} copyable />
              <DetailRow label="Branch" value={employee.bank_branch} />
            </div>
          </SectionCard>
        </div>

        {/* Right Column - Salary Breakdown */}
        <div className="space-y-6">
          <SectionCard title="Salary Structure" icon={Banknote}>
            <div className="space-y-4">
              {/* Earnings */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Earnings (Monthly)</h4>
                <div className="space-y-1.5">
                  <DetailRow label="Basic Salary" value={formatCurrency(employee.basic_salary)} />
                  <DetailRow label="HRA" value={formatCurrency(employee.hra)} />
                  <DetailRow label="Allowances" value={formatCurrency(employee.allowances)} />
                  <DetailRow label="Bonus" value={formatCurrency(employee.bonus)} />
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <DetailRow label="Gross Salary" value={<span className="font-semibold text-slate-700">{formatCurrency(grossSalary)}</span>} />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Deductions (Monthly)</h4>
                <div className="space-y-1.5">
                  <DetailRow 
                    label={`PF (${employee.pf_percentage || 0}%)`} 
                    value={formatCurrency(employee.pf_deduction)} 
                  />
                  <DetailRow label="ESI (Employee)" value={formatCurrency(employee.esi_employee)} />
                  <DetailRow 
                    label={`PT ${employee.pt_state ? `(${employee.pt_state})` : ''}`} 
                    value={
                      <span className={ptStateInfo?.hasPT === false ? 'text-red-500' : ''}>
                        {formatCurrency(employee.pt_amount)}
                        {ptStateInfo?.hasPT === false && <span className="text-xs ml-1">(N/A)</span>}
                      </span>
                    } 
                  />
                  <DetailRow label="TDS" value={formatCurrency(employee.tds_amount)} />
                  <DetailRow label="Other" value={formatCurrency(employee.other_deductions)} />
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <DetailRow label="Total Deductions" value={<span className="font-semibold text-red-600">- {formatCurrency(totalDeductions)}</span>} />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Net Salary</span>
                  <span className="text-lg font-bold text-slate-800">{formatCurrency(netSalary)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Annual CTC</span>
                  <span className="font-medium text-slate-600">{formatCurrency(annualCTC)}</span>
                </div>
                {employee.esi_employer > 0 && (
                  <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                    Employer ESI: {formatCurrency(employee.esi_employer)}/month
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-9">
                  <FileText size={14} /> Generate Payslip
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Quick Stats */}
          <SectionCard title="Quick Stats" icon={Shield}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Tenure</p>
                <p className="text-sm font-semibold text-slate-700">
                  {employee.joining_date ? 
                    Math.floor((new Date().getTime() - new Date(employee.joining_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' yrs' 
                    : '—'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">PF Balance</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency((employee.pf_deduction || 0) * 12)}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── PT States for reference (read-only display) ───────────────────
const PT_STATES = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh', hasPT: true },
  { value: 'Telangana', label: 'Telangana', hasPT: true },
  { value: 'Karnataka', label: 'Karnataka', hasPT: true },
  { value: 'Tamil Nadu', label: 'Tamil Nadu', hasPT: true },
  { value: 'Kerala', label: 'Kerala', hasPT: true },
  { value: 'Maharashtra', label: 'Maharashtra', hasPT: true },
  { value: 'Gujarat', label: 'Gujarat', hasPT: true },
  { value: 'Rajasthan', label: 'Rajasthan', hasPT: true },
  { value: 'West Bengal', label: 'West Bengal', hasPT: true },
  { value: 'Delhi', label: 'Delhi', hasPT: true },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh', hasPT: true },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh', hasPT: true },
  { value: 'Punjab', label: 'Punjab', hasPT: true },
  { value: 'Haryana', label: 'Haryana', hasPT: true },
  { value: 'Odisha', label: 'Odisha', hasPT: false },
  { value: 'Assam', label: 'Assam', hasPT: false },
  { value: 'Bihar', label: 'Bihar', hasPT: false },
  { value: 'Jharkhand', label: 'Jharkhand', hasPT: false },
  { value: 'Chhattisgarh', label: 'Chhattisgarh', hasPT: false },
  { value: 'Uttarakhand', label: 'Uttarakhand', hasPT: false },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh', hasPT: false },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir', hasPT: false },
  { value: 'Goa', label: 'Goa', hasPT: false },
  { value: 'Puducherry', label: 'Puducherry', hasPT: false },
];