'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type {
  Payroll,
  PayrollItem,
  PayslipRequest,
  PayrollPaginationMeta,
  GeneratePayrollPayload,
} from '@/types/payroll';

import {
  IndianRupee, CheckCircle2, Clock, Mail, Loader2, Send,
  Check, X, Inbox, FileText, Plus, ChevronDown, ChevronUp,
  TrendingUp, Printer, BarChart3, CreditCard, Square,
  CheckSquare, MinusSquare, Filter, Calendar, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile { id: number; name: string; email: string; role: string; }
interface Employee {
  id: number; first_name: string; last_name: string;
  department?: { id: number; name: string; };
  designation?: { name: string; };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(n: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n === 0) return 'Zero';
  function below1000(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '');
    return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + below1000(num%100) : '');
  }
  const parts: string[] = [];
  const cr   = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000);   n %= 100000;
  const thou = Math.floor(n / 1000);     n %= 1000;
  if (cr)   parts.push(below1000(cr)   + ' Crore');
  if (lakh) parts.push(below1000(lakh) + ' Lakh');
  if (thou) parts.push(below1000(thou) + ' Thousand');
  if (n)    parts.push(below1000(n));
  return parts.join(' ');
}

function amountInWords(net: number): string {
  const rupees = Math.floor(net);
  const paise  = Math.round((net - rupees) * 100);
  let w = 'Rupees ' + numberToWords(rupees) + ' Only';
  if (paise) w += ' and ' + numberToWords(paise) + ' Paise';
  return w;
}

// ─── Payslip Print Modal ──────────────────────────────────────────────────────
function PayslipModal({ payroll, items, companyName, onClose }: {
  payroll: Payroll; items: PayrollItem[]; companyName: string; onClose: () => void;
}) {
  const earnings   = items.filter(i => i.type === 'earning');
  const deductions = items.filter(i => i.type === 'deduction');
  const net = Number(payroll.net_salary);
  const monthName = MONTHS[payroll.month - 1];
  const printDate = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function handlePrint() {
    const el = document.getElementById('payslip-print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
        .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 10px; }
        .header h1 { font-size: 16px; font-weight: bold; }
        .header p { font-size: 10px; color: #444; }
        .title { text-align: center; font-size: 13px; font-weight: bold; margin: 10px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #999; margin-bottom: 14px; }
        .info-col { padding: 8px 12px; }
        .info-col + .info-col { border-left: 1px solid #999; }
        .info-row { display: flex; gap: 8px; margin-bottom: 4px; }
        .info-label { color: #444; min-width: 120px; }
        .info-value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #f0f0f0; border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 10px; }
        td { border: 1px solid #ccc; padding: 5px 8px; }
        td.num { text-align: right; }
        .total-row td { font-weight: bold; background: #f8f8f8; }
        .net-pay { font-size: 13px; font-weight: bold; margin: 8px 0 4px; }
        .words { font-style: italic; font-size: 11px; margin-bottom: 16px; border-bottom: 1px solid #999; padding-bottom: 8px; }
        .footer { text-align: center; font-size: 9px; color: #666; margin-top: 24px; }
        .print-date { font-size: 9px; color: #666; margin-top: 4px; }
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Payslip — {monthName} {payroll.year}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition">
              <Printer size={14} /> Print / Download
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
              <X size={16} />
            </button>
          </div>
        </div>
        <div id="payslip-print-area" className="p-6 text-[11px] text-gray-800 font-[Arial,sans-serif]">
          <div className="header border-b-2 border-gray-900 pb-3 mb-4 text-center">
            <h1 className="text-base font-bold">{companyName || 'Techsprout AI Labs'}</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              8-2-293/82/A/787/1/4F/1, Road No36, 4th Floor, Jubilee Hills, Hyderabad, Shaikpet, Telangana, India, 500033
            </p>
          </div>
          <div className="title text-center font-bold text-sm mb-3">
            Payslip for the month of {monthName} {payroll.year}
          </div>
          <div className="info-grid grid grid-cols-2 border border-gray-400 mb-4 text-[10.5px]">
            <div className="info-col p-2 space-y-1">
              {[
                ['Name:', `${payroll.employee.first_name} ${payroll.employee.last_name}`],
                ['Joining Date:', '—'],
                ['Designation:', payroll.employee.designation?.name ?? '—'],
                ['Department:', payroll.employee.department?.name ?? '—'],
                ['Location:', 'Hyderabad'],
              ].map(([l, v]) => (
                <div key={l} className="info-row flex gap-2">
                  <span className="info-label text-gray-500 w-28 flex-shrink-0">{l}</span>
                  <span className="info-value font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="info-col p-2 border-l border-gray-400 space-y-1">
              {[
                ['Employee ID:', payroll.employee.employee_id ?? String(payroll.employee.id)],
                ['Bank Name:', '—'],
                ['Bank Account No:', 'xxxxxxxxxx'],
                ['PAN Number:', 'xxxxxxxxxx'],
                ['Effective Work Days:', String(payroll.working_days)],
                ['LOP:', String(payroll.lop_days)],
              ].map(([l, v]) => (
                <div key={l} className="info-row flex gap-2">
                  <span className="info-label text-gray-500 w-36 flex-shrink-0">{l}</span>
                  <span className="info-value font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <table className="w-full border-collapse mb-3 text-[10.5px]">
            <thead>
              <tr>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Earnings</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-right">Master</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-right">Actual</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left">Deductions</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-right">Actual</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(earnings.length, deductions.length) }).map((_, i) => {
                const earn = earnings[i];
                const ded  = deductions[i];
                return (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1">{earn?.name ?? ''}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{earn ? fmt(earn.amount) : ''}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{earn ? fmt(earn.amount) : ''}</td>
                    <td className="border border-gray-300 px-2 py-1">{ded?.name ?? ''}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{ded ? fmt(ded.amount) : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-gray-50">
                <td className="border border-gray-400 px-2 py-1">Total Earnings: INR.</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(payroll.gross_salary)}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(payroll.gross_salary)}</td>
                <td className="border border-gray-400 px-2 py-1">Total Deductions: INR.</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(payroll.total_deductions)}</td>
              </tr>
            </tbody>
          </table>
          <div className="net-pay flex items-baseline gap-2 mt-2">
            <span className="font-bold text-sm">Net Pay for the month</span>
            <span className="font-bold text-sm">₹{fmt(payroll.net_salary)}</span>
          </div>
          <div className="words italic text-[10.5px] border-b border-gray-400 pb-3 mb-4">
            ({amountInWords(net)})
          </div>
          <div className="footer text-center text-[9px] text-gray-500">
            This is a system generated payslip and does not require a signature
          </div>
          <div className="print-date text-[9px] text-gray-400 mt-1">Print Date: {printDate}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded Payroll Row ─────────────────────────────────────────────────────
function ExpandedRow({ payroll, isAdmin, emailingId, requestingId,
  selected, onSelect, onMarkPaid, onEmail, onRequestPayslip, onViewPayslip,
}: {
  payroll: Payroll; isAdmin: boolean;
  emailingId: number | null; requestingId: number | null;
  selected: boolean; onSelect: (id: number, checked: boolean) => void;
  onMarkPaid: (id: number) => void;
  onEmail: (id: number) => void;
  onRequestPayslip: (id: number) => void;
  onViewPayslip: (payroll: Payroll) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const gross = Number(payroll.gross_salary);
  const ded   = Number(payroll.total_deductions);
  const net   = Number(payroll.net_salary);
  const basic = Number(payroll.basic_salary);

  return (
    <>
      <tr className={`hover:bg-slate-50/60 transition-colors ${selected ? 'bg-blue-50/40' : ''}`}>
        {isAdmin && (
          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => onSelect(payroll.id, !selected)} className="flex items-center justify-center text-slate-400 hover:text-blue-600 transition">
              {selected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
            </button>
          </td>
        )}
        <td className="px-6 py-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          {isAdmin ? (
            <>
              <p className="font-semibold text-slate-800">{payroll.employee.first_name} {payroll.employee.last_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{payroll.employee.department?.name ?? '—'}</p>
            </>
          ) : (
            <p className="font-semibold text-slate-800">{MONTHS[payroll.month - 1]} {payroll.year}</p>
          )}
        </td>
        {isAdmin && (
          <td className="px-6 py-4 text-sm text-slate-600 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            {MONTHS[payroll.month - 1]} {payroll.year}
          </td>
        )}
        <td className="px-6 py-4 text-sm text-slate-700 font-medium cursor-pointer" onClick={() => setExpanded(e => !e)}>₹{fmt(payroll.gross_salary)}</td>
        <td className="px-6 py-4 text-sm text-red-500 font-medium cursor-pointer" onClick={() => setExpanded(e => !e)}>₹{fmt(payroll.total_deductions)}</td>
        <td className="px-6 py-4 text-sm font-bold text-green-600 cursor-pointer" onClick={() => setExpanded(e => !e)}>₹{fmt(payroll.net_salary)}</td>
        <td className="px-6 py-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
            payroll.status === 'paid' ? 'bg-green-100 text-green-700' :
            payroll.status === 'processed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
          }`}>{payroll.status}</span>
        </td>
        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {isAdmin && payroll.status !== 'paid' && (
              <button onClick={() => onMarkPaid(payroll.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm">
                <CreditCard size={12} /> Mark Paid
              </button>
            )}
            {isAdmin && (
              <button onClick={() => onEmail(payroll.id)} disabled={emailingId === payroll.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-60 shadow-sm">
                {emailingId === payroll.id ? <Loader2 size={12} className="animate-spin" /> : <><Mail size={12} /> Email</>}
              </button>
            )}
            <button onClick={() => onViewPayslip(payroll)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition shadow-sm">
              <FileText size={12} /> Payslip
            </button>
            {!isAdmin && payroll.status !== 'paid' && (
              <button onClick={() => onRequestPayslip(payroll.id)} disabled={requestingId === payroll.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-60 shadow-sm">
                {requestingId === payroll.id ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Request</>}
              </button>
            )}
            <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/40">
          <td colSpan={isAdmin ? 8 : 6} className="px-6 py-4">
            <div className="grid grid-cols-4 gap-4 text-xs">
              {[
                { label: 'Basic Salary', value: `₹${fmt(basic)}`, color: 'text-slate-700' },
                { label: 'Gross Salary', value: `₹${fmt(gross)}`, color: 'text-slate-700' },
                { label: 'Total Deductions', value: `₹${fmt(ded)}`, color: 'text-red-500' },
                { label: 'Net Salary', value: `₹${fmt(net)}`, color: 'text-green-600' },
                { label: 'Working Days', value: String(payroll.working_days), color: 'text-slate-700' },
                { label: 'Present Days', value: String(payroll.present_days), color: 'text-slate-700' },
                { label: 'LOP Days', value: String(payroll.lop_days), color: payroll.lop_days > 0 ? 'text-red-500' : 'text-slate-700' },
                { label: 'LOP Deduction', value: `₹${fmt(payroll.lop_deduction)}`, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                  <p className="text-slate-400 text-[10px] mb-0.5">{item.label}</p>
                  <p className={`font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            {payroll.paid_at && (
              <p className="text-[10px] text-slate-400 mt-3">Paid on: {new Date(payroll.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, onMarkPaid, onSendEmail, onClear, loading }: {
  selectedIds: number[];
  onMarkPaid: () => void;
  onSendEmail: () => void;
  onClear: () => void;
  loading: 'paid' | 'email' | null;
}) {
  if (selectedIds.length === 0) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-blue-600 rounded-xl text-white text-sm shadow-lg">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold">{selectedIds.length}</div>
        <span className="font-medium">{selectedIds.length} payroll{selectedIds.length > 1 ? 's' : ''} selected</span>
      </div>
      <button onClick={onMarkPaid} disabled={!!loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition disabled:opacity-60 text-xs">
        {loading === 'paid' ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />} Mark All Paid
      </button>
      <button onClick={onSendEmail} disabled={!!loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition disabled:opacity-60 text-xs">
        {loading === 'email' ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Email All
      </button>
      <button onClick={onClear} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition"><X size={14} /></button>
    </div>
  );
}

// ─── UNIVERSAL FILTER BAR (Works for both Admin & Employee) ─────────────────
function UniversalFilterBar({ filters, employees, departments, isAdmin, onFilterChange, onApply, onReset, loading }: {
  filters: { month: string; year: string; status: string; employee_id: string; department_id: string };
  employees: Employee[];
  departments: { id: number; name: string }[];
  isAdmin: boolean;
  onFilterChange: (key: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  const hasActiveFilters = filters.month || filters.year || filters.status || filters.employee_id || filters.department_id;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Filter size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {isAdmin ? 'Filter Payroll Records' : 'Filter Your Payslips'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAdmin ? 'Search by employee, department, month, year, or status' : 'Select month, year, or status to view specific statements'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Employee Filter - Admin Only */}
          {isAdmin && (
            <div className="relative min-w-[200px]">
              <select 
                value={filters.employee_id}
                onChange={(e) => onFilterChange('employee_id', e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.department?.name ? `(${emp.department.name})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Department Filter - Admin Only */}
          {isAdmin && (
            <div className="relative min-w-[160px]">
              <select 
                value={filters.department_id}
                onChange={(e) => onFilterChange('department_id', e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Month Filter */}
          <div className="relative min-w-[140px]">
            <select 
              value={filters.month}
              onChange={(e) => onFilterChange('month', e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
            >
              <option value="">All Months</option>
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Year Filter */}
          <div className="relative min-w-[120px]">
            <select 
              value={filters.year}
              onChange={(e) => onFilterChange('year', e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
            >
              <option value="">All Years</option>
              {YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[130px]">
            <select 
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
            >
              <option value="">All Status</option>
              <option value="processed">Processed</option>
              <option value="paid">Paid</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Apply Button */}
          <button 
            onClick={onApply}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
            Apply Filters
          </button>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button 
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-sm font-medium transition"
            >
              <X size={14} />
              Clear All
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Active filters:</span>
            {filters.employee_id && isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                Employee: {employees.find(e => e.id === Number(filters.employee_id))?.first_name} {employees.find(e => e.id === Number(filters.employee_id))?.last_name}
                <button onClick={() => onFilterChange('employee_id', '')} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            )}
            {filters.department_id && isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                Dept: {departments.find(d => d.id === Number(filters.department_id))?.name}
                <button onClick={() => onFilterChange('department_id', '')} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            )}
            {filters.month && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                {MONTHS[Number(filters.month) - 1]}
                <button onClick={() => onFilterChange('month', '')} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            )}
            {filters.year && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                {filters.year}
                <button onClick={() => onFilterChange('year', '')} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                {filters.status}
                <button onClick={() => onFilterChange('status', '')} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'register' | 'requests'>('register');
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('company_name') || 'Techsprout AI Labs';
    }
    return 'Techsprout AI Labs';
  });
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PayrollPaginationMeta | null>(null);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [processingReqId, setProcessingReqId] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [payslipModal, setPayslipModal] = useState<{ payroll: Payroll; items: PayrollItem[] } | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState({ 
    month: '', 
    year: '', 
    status: '',
    employee_id: '',
    department_id: ''
  });
  const [filterLoading, setFilterLoading] = useState(false);
  
  // Data for filters
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState<'paid' | 'email' | null>(null);

  // Generate modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [globalPfPct, setGlobalPfPct] = useState(0);
  const [genForm, setGenForm] = useState<GeneratePayrollPayload>({
    employee_id: 0, month: new Date().getMonth() + 1, year: CURRENT_YEAR,
    include_pf: true, include_pt: true, pf_percentage: 0, pt_amount: 0,
  });

  const isAdmin = user?.role === 'admin';

  // Select-all state
  const allPageIds = payrolls.map(p => p.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id));
  const someSelected = allPageIds.some(id => selectedIds.includes(id)) && !allSelected;

  function handleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(prev => [...new Set([...prev, ...allPageIds])]);
    else setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id)));
  }

  function handleSelectOne(id: number, checked: boolean) {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  async function applyFilters() {
    setFilterLoading(true);
    setPage(1);
    await loadData(1);
    setFilterLoading(false);
    toast.success('Filters applied successfully');
  }

  function resetFilters() {
    setFilters({ month: '', year: '', status: '', employee_id: '', department_id: '' });
    setPage(1);
    loadData(1);
    toast.success('Filters cleared');
  }

  useEffect(() => {
    // Load user data
    api.get('/user').then(r => setUser(r.data)).catch(console.error).finally(() => setLoadingUser(false));
    
    // Load settings
    api.get('/settings').then(r => {
      const pct = parseFloat(r.data?.pf_percentage ?? '0');
      setGlobalPfPct(pct);
      setGenForm(f => ({ ...f, pf_percentage: pct }));
      
      const name = r.data?.company_name;
      if (name) {
        setCompanyName(name);
        localStorage.setItem('company_name', name);
      }
    }).catch(() => {});
    
    // Load employees and departments for admin filters
    if (isAdmin) {
      api.get('/employees', { params: { per_page: 500 } }).then(r => {
        setEmployees(r.data.data ?? []);
      }).catch(console.error);
      
      api.get('/departments', { params: { per_page: 100 } }).then(r => {
        setDepartments(r.data.data ?? []);
      }).catch(console.error);
    }
  }, [isAdmin]);

  async function loadData(p = 1) {
    setLoadingData(true);
    try {
      if (isAdmin && activeTab === 'requests') {
        const params: any = { page: p, per_page: 10 };
        if (filters.status) params.status = filters.status;
        if (filters.employee_id) params.employee_id = filters.employee_id;
        
        const r = await api.get('/payroll-requests', { params });
        setRequests(r.data.data ?? []);
        setMeta(r.data.meta ?? null);
      } else {
        const params: any = { page: p, per_page: 10 };
        
        // Apply filters for both admin and employee
        if (filters.month) params.month = filters.month;
        if (filters.year) params.year = filters.year;
        if (filters.status) params.status = filters.status;
        
        // Admin-only filters
        if (isAdmin) {
          if (filters.employee_id) params.employee_id = filters.employee_id;
          if (filters.department_id) params.department_id = filters.department_id;
        }
        
        const r = await api.get('/payrolls', { params });
        setPayrolls(r.data.data ?? []);
        setMeta(r.data.meta ?? null);
      }
    } catch (e) {
      console.error('Error loading data:', e);
      toast.error('Failed to load payroll data');
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loadingUser) {
      setPage(1);
      setSelectedIds([]);
      loadData(1);
    }
  }, [activeTab, loadingUser]);

  useEffect(() => {
    if (!loadingUser && page > 1) loadData(page);
  }, [page]);

  async function openPayslip(payroll: Payroll) {
    try {
      const r = await api.get(`/payrolls/${payroll.id}/items`);
      const items = r.data.items ?? r.data ?? [];
      setPayslipModal({ payroll, items });
    } catch (error) {
      console.error('Error loading payslip:', error);
      toast.error('Failed to load payslip details');
      setPayslipModal({ payroll, items: [] });
    }
  }

  async function openGenModal() {
    setShowGenModal(true);
    setLoadingEmps(true);
    try {
      const r = await api.get('/employees', { params: { per_page: 100 } });
      setEmployees(r.data.data ?? []);
    } catch {
      toast.error('Failed to load employees.');
    } finally {
      setLoadingEmps(false);
    }
    setGenForm(f => ({
      ...f,
      employee_id: 0,
      month: new Date().getMonth() + 1,
      year: CURRENT_YEAR,
      include_pf: true,
      include_pt: true,
      pf_percentage: globalPfPct,
      pt_amount: 0,
    }));
  }

  async function handleGenerate() {
    if (!genForm.employee_id) {
      toast.error('Please select an employee.');
      return;
    }
    const pct = genForm.pf_percentage ?? 0;
    if (genForm.include_pf && (pct < 0 || pct > 12)) {
      toast.error('PF percentage must be 0–12%.');
      return;
    }
    setGenerating(true);
    try {
      await api.post('/payrolls/generate', genForm);
      toast.success('Payroll generated successfully.');
      setShowGenModal(false);
      loadData(1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid(id: number) {
    try {
      await api.post(`/payrolls/${id}/mark-paid`);
      toast.success('Payroll marked as paid.');
      loadData(page);
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  }

  async function sendEmail(id: number) {
    setEmailingId(id);
    try {
      await api.post(`/payrolls/${id}/send-email`);
      toast.success('Payslip emailed successfully.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Email delivery failed.');
    } finally {
      setEmailingId(null);
    }
  }

  async function requestPayslip(id: number) {
    setRequestingId(id);
    try {
      await api.post(`/payrolls/${id}/request-payslip`);
      toast.success('Request sent to HR.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setRequestingId(null);
    }
  }

  async function fulfillRequest(id: number, status: 'approved' | 'rejected') {
    setProcessingReqId(id);
    try {
      await api.patch(`/payroll-requests/${id}/fulfill`, { status });
      toast.success(`Request ${status}.`);
      loadData(page);
    } catch {
      toast.error('Failed to update request.');
    } finally {
      setProcessingReqId(null);
    }
  }

  async function handleBulkMarkPaid() {
    if (selectedIds.length === 0) return;
    setBulkLoading('paid');
    try {
      const r = await api.post('/payrolls/bulk-mark-paid', { ids: selectedIds });
      toast.success(r.data.message ?? `${selectedIds.length} payroll(s) marked as paid.`);
      setSelectedIds([]);
      loadData(page);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Bulk mark paid failed.');
    } finally {
      setBulkLoading(null);
    }
  }

  async function handleBulkSendEmail() {
    if (selectedIds.length === 0) return;
    setBulkLoading('email');
    try {
      const r = await api.post('/payrolls/bulk-send-email', { ids: selectedIds });
      toast.success(r.data.message ?? `Emails sent.`);
      if (r.data.failed?.length > 0) toast.warning(`${r.data.failed.length} email(s) failed to send.`);
      setSelectedIds([]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Bulk email failed.');
    } finally {
      setBulkLoading(null);
    }
  }

  const totalNet = payrolls.reduce((s, p) => s + Number(p.net_salary), 0);
  const totalGross = payrolls.reduce((s, p) => s + Number(p.gross_salary), 0);
  const paidCount = payrolls.filter(p => p.status === 'paid').length;
  const processedCnt = payrolls.filter(p => p.status === 'processed').length;

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdmin ? 'Payroll Center' : 'My Salary Slips'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Manage payroll records and employee payslip requests' : 'View and request your historical pay statements'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && activeTab === 'register' && (
            <button onClick={openGenModal} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition shadow-sm">
              <Plus size={15} /> Generate Payroll
            </button>
          )}
          {isAdmin && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['register', 'requests'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'requests' && <Inbox size={12} />}
                  {tab === 'register' ? 'Payroll Register' : 'Employee Requests'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards - Admin Only */}
      {isAdmin && activeTab === 'register' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: IndianRupee, label: 'Total Net Payroll', value: `₹${fmt(totalNet)}`, bg: 'bg-green-50', ic: 'text-green-600' },
            { icon: TrendingUp, label: 'Gross Allocation', value: `₹${fmt(totalGross)}`, bg: 'bg-blue-50', ic: 'text-blue-600' },
            { icon: Clock, label: 'Processed', value: String(processedCnt), bg: 'bg-amber-50', ic: 'text-amber-600' },
            { icon: CheckCircle2, label: 'Completed Payments', value: String(paidCount), bg: 'bg-emerald-50', ic: 'text-emerald-600' },
          ].map(({ icon: Icon, label, value, bg, ic }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-slate-800 mt-1.5">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${ic}`}>
                <Icon size={20} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UNIVERSAL FILTER BAR - Works for both Admin and Employee */}
      {activeTab === 'register' && (
        <UniversalFilterBar
          filters={filters}
          employees={employees}
          departments={departments}
          isAdmin={isAdmin}
          onFilterChange={handleFilterChange}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={filterLoading}
        />
      )}

      {/* Bulk Action Bar - Admin Only */}
      {isAdmin && activeTab === 'register' && selectedIds.length > 0 && (
        <BulkActionBar 
          selectedIds={selectedIds} 
          onMarkPaid={handleBulkMarkPaid} 
          onSendEmail={handleBulkSendEmail} 
          onClear={() => setSelectedIds([])} 
          loading={bulkLoading} 
        />
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : activeTab === 'register' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-4 w-10">
                      <button onClick={() => handleSelectAll(!allSelected)} className="flex items-center justify-center text-slate-400 hover:text-blue-600 transition">
                        {allSelected ? <CheckSquare size={16} className="text-blue-600" /> : someSelected ? <MinusSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{isAdmin ? 'Employee' : 'Period'}</th>
                  {isAdmin && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</th>}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 6} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar size={40} className="text-slate-300" />
                        <p className="text-sm text-slate-400">
                          {(filters.month || filters.year || filters.status || filters.employee_id || filters.department_id)
                            ? 'No payslips found for selected filters. Try adjusting your criteria.'
                            : 'No payroll records found.'}
                        </p>
                        {(filters.month || filters.year || filters.status || filters.employee_id || filters.department_id) && (
                          <button onClick={resetFilters} className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  payrolls.map(p => (
                    <ExpandedRow
                      key={p.id}
                      payroll={p}
                      isAdmin={isAdmin}
                      emailingId={emailingId}
                      requestingId={requestingId}
                      selected={selectedIds.includes(p.id)}
                      onSelect={handleSelectOne}
                      onMarkPaid={markPaid}
                      onEmail={sendEmail}
                      onRequestPayslip={requestPayslip}
                      onViewPayslip={openPayslip}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Employee', 'Period Requested', 'Net Compensation', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-14 text-sm text-slate-300">No active requests.</td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{req.employee.first_name} {req.employee.last_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{req.employee.department?.name ?? '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{MONTHS[req.payroll.month - 1]} {req.payroll.year}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">₹{fmt(req.payroll.net_salary)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' : req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => fulfillRequest(req.id, 'approved')} disabled={processingReqId === req.id} className="w-8 h-8 rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition" title="Approve">
                              <Check size={14} />
                            </button>
                            <button onClick={() => fulfillRequest(req.id, 'rejected')} disabled={processingReqId === req.id} className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition" title="Reject">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-700">{(page - 1) * 10 + 1}</b> to{' '}
              <b className="text-slate-700">{Math.min(page * 10, meta.total)}</b> of{' '}
              <b className="text-slate-700">{meta.total}</b>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="h-8 px-3 text-xs bg-white border-slate-200">
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p < (meta?.last_page ?? 1) ? p + 1 : p)} disabled={page === (meta?.last_page ?? 1)} className="h-8 px-3 text-xs bg-white border-slate-200">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Generate Payroll</h2>
                <p className="text-xs text-slate-400 mt-0.5">Calculates salary from attendance & structure</p>
              </div>
              <button onClick={() => setShowGenModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Employee</label>
                <div className="relative">
                  <select value={genForm.employee_id} onChange={e => setGenForm(f => ({ ...f, employee_id: Number(e.target.value) }))} disabled={loadingEmps} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-9">
                    <option value={0}>{loadingEmps ? 'Loading...' : 'Select employee'}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.department?.name ? ` – ${e.department.name}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Month', key: 'month' as const, options: MONTHS.map((m, i) => ({ label: m, value: i + 1 })) },
                  { label: 'Year', key: 'year' as const, options: YEARS.map(y => ({ label: String(y), value: y })) },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                    <div className="relative">
                      <select value={genForm[key]} onChange={e => setGenForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-9">
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Deduction Options</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Provident Fund (PF)</p>
                      <p className="text-xs text-slate-400">Percentage of basic salary</p>
                    </div>
                    <button type="button"
                      onClick={() => setGenForm(f => ({ ...f, include_pf: !f.include_pf, pf_percentage: f.include_pf ? 0 : globalPfPct }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${genForm.include_pf ? 'bg-slate-800' : 'bg-slate-300'}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${genForm.include_pf ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {genForm.include_pf && (
                    <div className="px-4 pb-3 pt-3 border-t border-slate-200">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">PF Rate (0–12%)</label>
                      <div className="relative">
                        <select value={genForm.pf_percentage ?? 0}
                          onChange={e => setGenForm(f => ({ ...f, pf_percentage: Number(e.target.value) }))}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8">
                          {Array.from({length:13},(_,i)=>i).map(v => <option key={v} value={v}>{v}%</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Professional Tax (PT)</p>
                      <p className="text-xs text-slate-400">State-level fixed tax deduction</p>
                    </div>
                    <button type="button"
                      onClick={() => setGenForm(f => ({ ...f, include_pt: !f.include_pt, pt_amount: 0 }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${genForm.include_pt ? 'bg-slate-800' : 'bg-slate-300'}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${genForm.include_pt ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {genForm.include_pt && (
                    <div className="px-4 pb-3 pt-3 border-t border-slate-200">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">PT Amount</label>
                      <div className="relative">
                        <select value={genForm.pt_amount ?? 0}
                          onChange={e => setGenForm(f => ({ ...f, pt_amount: Number(e.target.value) }))}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8">
                          {[0,100,150,200,300,400,500].map(v => <option key={v} value={v}>₹{v}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setShowGenModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || !genForm.employee_id} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {payslipModal && (
        <PayslipModal
          payroll={payslipModal.payroll}
          items={payslipModal.items}
          companyName={companyName}
          onClose={() => setPayslipModal(null)}
        />
      )}
    </div>
  );
}