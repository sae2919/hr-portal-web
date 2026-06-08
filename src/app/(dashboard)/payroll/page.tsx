'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type {
  Payroll,
  PayrollItem,
  PayrollPaginationMeta,
  GeneratePayrollPayload,
} from '@/types/payroll';

// ── Module-level caches — survive tab navigation, reset on browser refresh ──
let _payrollEmployeeCache: Employee[] | null = null;
let _payrollEmployeePending: Promise<Employee[]> | null = null;
let _payrollDeptCache: { id: number; name: string }[] | null = null;
let _payrollDeptPending: Promise<{ id: number; name: string }[]> | null = null;
let _payrollSettingsCache: { pf_percentage: number; company_name?: string } | null = null;

import {
  IndianRupee, CheckCircle2, Clock, Mail, Loader2, Send,
  Check, X, FileText, Plus, ChevronDown, ChevronUp,
  TrendingUp, Printer, BarChart3, CreditCard, Square,
  CheckSquare, MinusSquare, Filter, Calendar, Users, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile { id: number; name: string; email: string; role: string; }
interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id?: string;
  joining_date?: string;
  bank_name?: string;
  bank_account_number?: string;
  pan_number?: string;
  department?: { id: number; name: string; };
  designation?: { title: string; name?: string; };
  employment_type?: string;
  basic_salary?: number;
  hra?: number;
  allowances?: any;
  bonus?: number;
  pt_state?: string;
  pt_amount?: number;
  status?: string;
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

const PT_SLABS: Record<string, { upTo: number; pt: number }[]> = {
  'Andhra Pradesh':    [{ upTo: 15000, pt: 0 }, { upTo: 20000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Karnataka':         [{ upTo: 15000, pt: 0 }, { upTo: Infinity, pt: 200 }],
  'Maharashtra':       [{ upTo: 7500,  pt: 0 }, { upTo: 10000, pt: 175 }, { upTo: Infinity, pt: 200 }],
  'Tamil Nadu':        [{ upTo: 21000, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'West Bengal':       [{ upTo: 10000, pt: 0 }, { upTo: 15000, pt: 110 }, { upTo: 25000, pt: 130 }, { upTo: 40000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Gujarat':           [{ upTo: 5999,  pt: 0 }, { upTo: 8999, pt: 80 }, { upTo: 11999, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Madhya Pradesh':    [{ upTo: 18750, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Telangana':         [{ upTo: 15000, pt: 0 }, { upTo: 20000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Kerala':            [{ upTo: 11999, pt: 0 }, { upTo: 17999, pt: 120 }, { upTo: 29999, pt: 180 }, { upTo: Infinity, pt: 208 }],
  'Assam':             [{ upTo: 10000, pt: 0 }, { upTo: 15000, pt: 150 }, { upTo: 25000, pt: 180 }, { upTo: Infinity, pt: 208 }],
  'Bihar':             [{ upTo: 25000, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Jharkhand':         [{ upTo: 25000, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Odisha':            [{ upTo: 13304, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Punjab':            [{ upTo: Infinity, pt: 200 }],
  'Sikkim':            [{ upTo: 20000, pt: 0 }, { upTo: 30000, pt: 125 }, { upTo: 40000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Meghalaya':         [{ upTo: 4166, pt: 0 }, { upTo: 6250, pt: 16 }, { upTo: 8333, pt: 25 }, { upTo: 12500, pt: 41 }, { upTo: 16666, pt: 83 }, { upTo: 20833, pt: 166 }, { upTo: Infinity, pt: 208 }],
  'Tripura':           [{ upTo: 7500,  pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Manipur':           [{ upTo: 5000,  pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Mizoram':           [{ upTo: 5000,  pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Nagaland':          [{ upTo: Infinity, pt: 208 }],
  'Delhi':             [{ upTo: Infinity, pt: 0 }],
  'Rajasthan':         [{ upTo: Infinity, pt: 0 }],
  'Uttar Pradesh':     [{ upTo: Infinity, pt: 0 }],
  'Haryana':           [{ upTo: Infinity, pt: 0 }],
  'Himachal Pradesh':  [{ upTo: Infinity, pt: 0 }],
  'Uttarakhand':       [{ upTo: Infinity, pt: 0 }],
  'Jammu & Kashmir':   [{ upTo: Infinity, pt: 0 }],
  'Chhattisgarh':      [{ upTo: Infinity, pt: 0 }],
  'Goa':               [{ upTo: Infinity, pt: 0 }],
  'Arunachal Pradesh': [{ upTo: Infinity, pt: 0 }],
};

const PT_STATES = Object.keys(PT_SLABS).sort();

function calculatePT(state: string, gross: number): number {
  const slabs = PT_SLABS[state];
  if (!slabs) return 0;
  for (const slab of slabs) {
    if (gross <= slab.upTo) return slab.pt;
  }
  return 0;
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

  // Master structure rates from relationship
  const structure = (payroll as any).salary_structure;
  const masterBasic = structure?.basic_salary ?? 0;
  const masterHra = structure?.hra ?? 0;
  const masterAllowances = structure?.allowances ?? 0;
  const masterBonus = structure?.bonus ?? 0;
  const masterGross = structure?.gross_salary ?? 0;

  // Actual earnings details
  const actualBasic = earnings.find(i => i.name === 'Stipend')?.amount
    || earnings.find(i => i.name === 'Basic Salary')?.amount
    || earnings.find(i => i.name.toLowerCase().includes('basic'))?.amount
    || payroll.basic_salary || '0';

  const actualHra = earnings.find(i => i.name === 'HRA')?.amount
    || earnings.find(i => i.name.toLowerCase().includes('hra'))?.amount
    || '0';

  const actualAllowances = earnings.find(i => i.name === 'Allowances')?.amount
    || earnings.find(i => i.name.toLowerCase().includes('allowance'))?.amount
    || '0';

  const actualBonus = earnings.find(i => i.name === 'Bonus')?.amount
    || earnings.find(i => i.name.toLowerCase().includes('bonus'))?.amount
    || '0';

  const isIntern = (payroll.employee as any)?.employment_type === 'intern';

  // Earning rows
  const leftRows: Array<{ label: string; master: number | null; actual: number | null }> = isIntern ? [
    { label: 'Stipend', master: Number(masterBasic), actual: Number(actualBasic) },
  ] : [
    { label: 'Basic Salary', master: Number(masterBasic), actual: Number(actualBasic) },
    { label: 'HRA', master: Number(masterHra), actual: Number(actualHra) },
    { label: 'Special Allowance', master: Number(masterAllowances), actual: Number(actualAllowances) },
  ];

  if (!isIntern && (Number(masterBonus) > 0 || Number(actualBonus) > 0)) {
    leftRows.push({ label: 'Bonus', master: Number(masterBonus), actual: Number(actualBonus) });
  }

  // Dynamic earnings
  const knownEarningNames = ['basic salary', 'basic', 'hra', 'allowances', 'special allowance', 'bonus', 'stipend'];
  earnings.forEach(item => {
    const lowerName = item.name.toLowerCase();
    if (!knownEarningNames.some(kn => lowerName.includes(kn))) {
      leftRows.push({ label: item.name, master: 0, actual: Number(item.amount) });
    }
  });

  // Deduction rows
  const lopDeduction = Number(payroll.lop_deduction || 0);
  const rightRows: Array<{ label: string; actual: number | null }> = [];

  // Always show LOP Deduction first if there are any LOP days
  if (lopDeduction > 0) {
    rightRows.push({ label: 'LOP', actual: lopDeduction });
  }

  if (!isIntern) {
    deductions.forEach(item => {
      let label = item.name;
      if (label.toLowerCase().includes('prof') || label.toLowerCase().includes('professional')) {
        label = 'Prof Tax';
      }
      rightRows.push({ label, actual: Number(item.amount) });
    });

    if (rightRows.length === 0) {
      rightRows.push({ label: 'Prof Tax', actual: 0 });
    }
  } else {
    // For interns, show LOP only if non-zero — already pushed above
    if (lopDeduction === 0) {
      rightRows.push({ label: '—', actual: null });
    }
  }

  // Row balancing
  const maxRows = Math.max(leftRows.length, rightRows.length);
  while (leftRows.length < maxRows) {
    leftRows.push({ label: '', master: null, actual: null });
  }
  while (rightRows.length < maxRows) {
    rightRows.push({ label: '', actual: null });
  }

  function handlePrint() {
    const el = document.getElementById('payslip-print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Times New Roman', Times, Georgia, serif; font-size: 11px; color: #111; padding: 24px; }
        .header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 5px; }
        .header-table td { border: none; padding: 0; }
        .logo-cell { width: 15%; vertical-align: middle; }
        .logo { max-height: 45px; max-width: 120px; object-fit: contain; }
        .company-details-cell { width: 85%; text-align: center; vertical-align: middle; }
        .company-name { font-size: 16px; font-weight: bold; margin: 0 0 3px 0; color: #000; }
        .company-address { font-size: 9px; color: #333; margin: 0; line-height: 1.2; }
        .title { text-align: center; font-size: 13px; font-weight: bold; margin: 15px 0 10px 0; }
        .info-grid { border: 1px solid #777; margin-bottom: 14px; }
        .info-col { padding: 5px 8px; }
        .info-col + .info-col { border-left: 1px solid #777; }
        .info-row { display: flex; gap: 8px; margin-bottom: 4px; }
        .info-label { color: #444; min-width: 120px; }
        .info-value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #fff; border: 1px solid #777; padding: 5px 8px; text-align: center; font-size: 10px; font-weight: bold; }
        td { border: 1px solid #777; padding: 4px 8px; font-size: 10px; }
        td.num { text-align: right; }
        .total-row td { font-weight: bold; background: #fff; }
        .net-pay { font-size: 11px; font-weight: bold; margin: 15px 0 4px; }
        .words { font-weight: bold; font-style: italic; font-size: 11px; margin-bottom: 16px; border-bottom: 1px solid #777; padding-bottom: 8px; }
        .footer { text-align: center; font-size: 9px; color: #777; margin-top: 25px; border-top: none; }
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
        <div id="payslip-print-area" className="p-6 text-[11px] text-gray-800 leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}>
          
          {/* Header Layout Table */}
          <table className="w-full border-collapse mb-1">
            <tbody>
              <tr>
                <td className="w-[15%] align-middle border-none p-0">
                  <img src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`} alt="Logo" className="max-h-[45px] max-w-[120px] object-contain logo" />
                </td>
                <td className="w-[70%] text-center align-middle border-none p-0">
                  <h1 className="company-name text-base font-bold m-0" style={{ fontSize: '16px', margin: '0 0 3px 0' }}>
                    {companyName || 'Techsprout AI Labs'}
                  </h1>
                  <p className="company-address text-[9px] text-gray-600 m-0" style={{ fontSize: '9px', lineHeight: '1.2' }}>
                    8-2-293/82/A/787/1/4F/1, Road No36, 4th Floor, Jubilee Hills, Hyderabad, Shaikpet, Telangana, India, 500033
                  </p>
                </td>
                <td className="w-[15%] border-none p-0"></td>
              </tr>
            </tbody>
          </table>

          <div className="title text-center font-bold text-sm mb-3">
            Payslip for the month of {monthName} {payroll.year}
          </div>
          
          {/* Employee Details Matrix using standard nested tables to match PDF */}
          <table className="w-full border-collapse mb-4 text-[10.5px]" style={{ border: '1px solid #777' }}>
            <tbody>
              <tr>
                <td className="w-1/2 p-2 border-r border-gray-400 align-top" style={{ padding: '5px 8px' }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[35%] py-0.5 border-none font-normal text-gray-500">Name:</td>
                        <td className="w-[65%] py-0.5 border-none font-normal">{payroll.employee.first_name} {payroll.employee.last_name}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Joining Date:</td>
                        <td className="py-0.5 border-none font-normal">
                          {payroll.employee.joining_date ? new Date(payroll.employee.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Designation:</td>
                        <td className="py-0.5 border-none font-normal">{payroll.employee.designation?.title ?? payroll.employee.designation?.name ?? '—'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Department:</td>
                        <td className="py-0.5 border-none font-normal">{payroll.employee.department?.name ?? '—'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Location:</td>
                        <td className="py-0.5 border-none font-normal">Hyderabad</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="w-1/2 p-2 align-top" style={{ padding: '5px 8px' }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[45%] py-0.5 border-none font-normal text-gray-500">Employee Code:</td>
                        <td className="py-0.5 border-none font-normal">{(payroll.employee as any).employee_code || payroll.employee.employee_id || String(payroll.employee.id)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Bank Name:</td>
                        <td className="py-0.5 border-none font-normal">{payroll.employee.bank_name ?? '—'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Bank Account No:</td>
                        <td className="py-0.5 border-none font-normal">
                          {payroll.employee.bank_account_number 
                            ? (payroll.employee.bank_account_number.length > 4 
                               ? 'x'.repeat(payroll.employee.bank_account_number.length - 4) + payroll.employee.bank_account_number.slice(-4) 
                               : payroll.employee.bank_account_number)
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">PAN Number:</td>
                        <td className="py-0.5 border-none font-normal">
                          {payroll.employee.pan_number 
                            ? (payroll.employee.pan_number.length > 4 
                               ? 'x'.repeat(payroll.employee.pan_number.length - 4) + payroll.employee.pan_number.slice(-4) 
                               : payroll.employee.pan_number)
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">Effective Work Days:</td>
                        <td className="py-0.5 border-none font-normal">{payroll.present_days}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 border-none font-normal text-gray-500">LOP:</td>
                        <td className="py-0.5 border-none font-normal">{Math.round(Number(payroll.lop_days))}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse mb-3 text-[10.5px]">
            <thead>
              <tr>
                <th className="border border-gray-400 bg-white px-2 py-1 text-center font-bold">Earnings</th>
                <th className="border border-gray-400 bg-white px-2 py-1 text-center font-bold">Master</th>
                <th className="border border-gray-400 bg-white px-2 py-1 text-center font-bold">Actual</th>
                <th className="border border-gray-400 bg-white px-2 py-1 text-center font-bold">Deductions</th>
                <th className="border border-gray-400 bg-white px-2 py-1 text-center font-bold">Actual</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, i) => {
                const earn = leftRows[i];
                const ded  = rightRows[i];
                return (
                  <tr key={i}>
                    <td className="border border-gray-400 px-2 py-1">{earn?.label ?? ''}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{earn?.master !== null ? fmt(earn.master) : ''}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{earn?.actual !== null ? fmt(earn.actual) : ''}</td>
                    <td className="border border-gray-400 px-2 py-1">{ded?.label ?? ''}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{ded?.actual !== null ? fmt(ded.actual) : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-white">
                <td className="border border-gray-400 px-2 py-1">Total Earnings:INR.:</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(masterGross)}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(payroll.gross_salary)}</td>
                <td className="border border-gray-400 px-2 py-1">Total Deductions:INR.</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{fmt(Number(payroll.total_deductions) + lopDeduction)}</td>
              </tr>
            </tbody>
          </table>
          
          <div className="net-pay flex items-baseline gap-2 mt-2 font-bold text-sm">
            <span>Net Pay for the month</span>
            <span>{fmt(payroll.net_salary)}</span>
          </div>
          <div className="words font-bold italic text-[10.5px] border-b border-gray-400 pb-3 mb-4">
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
function ExpandedRow({ payroll, isAdmin, emailingId, deletingId,
  selected, onSelect, onMarkPaid, onEmail, onViewPayslip, onDelete,
}: {
  payroll: Payroll; isAdmin: boolean;
  emailingId: number | null;
  deletingId: number | null;
  selected: boolean; onSelect: (id: number, checked: boolean) => void;
  onMarkPaid: (id: number) => void;
  onEmail: (id: number) => void;
  onViewPayslip: (payroll: Payroll) => void;
  onDelete: (id: number) => void;
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
              <button onClick={() => onDelete(payroll.id)} disabled={deletingId === payroll.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-60 shadow-sm">
                {deletingId === payroll.id ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> Delete</>}
              </button>
            )}
            {isAdmin && payroll.status !== 'paid' && (
              <button onClick={() => onMarkPaid(payroll.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm">
                <CreditCard size={12} /> Mark Paid
              </button>
            )}
            {isAdmin && payroll.status === 'paid' && (
              <button onClick={() => onEmail(payroll.id)} disabled={emailingId === payroll.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-60 shadow-sm">
                {emailingId === payroll.id ? <Loader2 size={12} className="animate-spin" /> : <><Mail size={12} /> Email</>}
              </button>
            )}
            <button onClick={() => onViewPayslip(payroll)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition shadow-sm">
              <FileText size={12} /> Payslip
            </button>

            <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (() => {
        const isIntern = (payroll.employee as any)?.employment_type === 'intern';
        const workingDays = Number(payroll.working_days);
        const lopDays = Number(payroll.lop_days);
        const attendanceFactor = workingDays > 0 ? (workingDays - lopDays) / workingDays : 1;
        const structure = (payroll as any).salary_structure;
        const masterHra = structure?.hra ? Number(structure.hra) : 0;
        const masterAllowances = structure?.allowances ? Number(structure.allowances) : 0;
        
        const proratedHra = masterHra * attendanceFactor;
        const proratedAllowances = masterAllowances * attendanceFactor;

        const detailItems = [
          { label: isIntern ? 'Stipend' : 'Basic Salary', value: `₹${fmt(basic)}`, color: 'text-slate-700' },
        ];

        if (!isIntern) {
          detailItems.push(
            { label: 'HRA', value: `₹${fmt(proratedHra)}`, color: 'text-slate-700' },
            { label: 'Special Allowance', value: `₹${fmt(proratedAllowances)}`, color: 'text-slate-700' }
          );
        }

        detailItems.push(
          { label: 'Gross Salary', value: `₹${fmt(gross)}`, color: 'text-slate-700 font-semibold' },
          { label: 'Total Deductions', value: `₹${fmt(ded)}`, color: 'text-red-500' },
          { label: 'Net Salary', value: `₹${fmt(net)}`, color: 'text-green-600 font-semibold' },
          { label: 'Working Days', value: String(payroll.working_days), color: 'text-slate-700' },
          { label: 'Present Days', value: String(payroll.present_days), color: 'text-slate-700' },
          { label: 'LOP Days', value: String(payroll.lop_days), color: payroll.lop_days > 0 ? 'text-red-500' : 'text-slate-700' },
          { label: 'LOP Deduction', value: `₹${fmt(payroll.lop_deduction)}`, color: 'text-red-400' }
        );

        return (
          <tr className="bg-slate-50/40">
            <td colSpan={isAdmin ? 8 : 6} className="px-6 py-4">
              <div className={`grid gap-4 text-xs grid-cols-2 sm:grid-cols-4 ${isIntern ? '' : 'lg:grid-cols-5'}`}>
                {detailItems.map(item => (
                  <div key={item.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 shadow-sm">
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
        );
      })()}
    </>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, onMarkPaid, onSendEmail, onClear, loading, allSelectedArePaid }: {
  selectedIds: number[];
  onMarkPaid: () => void;
  onSendEmail: () => void;
  onClear: () => void;
  loading: 'paid' | 'email' | null;
  allSelectedArePaid: boolean;
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
      {allSelectedArePaid && (
        <button onClick={onSendEmail} disabled={!!loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition disabled:opacity-60 text-xs">
          {loading === 'email' ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Email All
        </button>
      )}
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
              <SearchableSelect
                options={[
                  { id: '', label: 'All Employees' },
                  ...employees.map(emp => ({
                    id: emp.id,
                    label: `${emp.first_name} ${emp.last_name}`,
                    sublabel: emp.department?.name ? emp.department.name : undefined
                  }))
                ]}
                value={filters.employee_id === '' ? '' : Number(filters.employee_id)}
                onChange={(val) => onFilterChange('employee_id', val === '' ? '' : String(val))}
                placeholder="All Employees"
              />
            </div>
          )}

          {/* Department Filter - Admin Only */}
          {isAdmin && (
            <div className="relative min-w-[160px]">
              <SearchableSelect
                options={[
                  { id: '', label: 'All Departments' },
                  ...departments.map(dept => ({
                    id: dept.id,
                    label: dept.name
                  }))
                ]}
                value={filters.department_id === '' ? '' : Number(filters.department_id)}
                onChange={(val) => onFilterChange('department_id', val === '' ? '' : String(val))}
                placeholder="All Departments"
              />
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
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('company_name') || 'Techsprout AI Labs';
    }
    return 'Techsprout AI Labs';
  });
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PayrollPaginationMeta | null>(null);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  // Check if all selected payrolls are marked as paid
  const allSelectedArePaid = useMemo(() => {
    if (selectedIds.length === 0) return false;
    return selectedIds.every(id => {
      const p = payrolls.find(pay => pay.id === id);
      return p ? p.status === 'paid' : false;
    });
  }, [selectedIds, payrolls]);

  // Generate modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; employeeName: string } | null>(null);
  const [globalPfPct, setGlobalPfPct] = useState(0);
  const [genForm, setGenForm] = useState<GeneratePayrollPayload>({
    employee_id: 0, month: new Date().getMonth() + 1, year: CURRENT_YEAR,
    include_pf: true, include_pt: true, pf_percentage: 0, pt_amount: 0,
  });
  const [selectedPtState, setSelectedPtState] = useState<string>('');

  // Recalculate PT when selected employee changes
  useEffect(() => {
    if (!genForm.employee_id) {
      setSelectedPtState('');
      setGenForm(f => ({ ...f, pt_amount: 0 }));
      return;
    }

    const selectedEmp = employees.find(e => e.id === (genForm.employee_id as any));
    if (selectedEmp) {
      const defaultState = selectedEmp.pt_state || '';
      setSelectedPtState(defaultState);

      // calculate gross
      const basic = Number(selectedEmp.basic_salary) || 0;
      const hra = Number(selectedEmp.hra) || 0;
      const bonus = Number(selectedEmp.bonus) || 0;
      let allowancesVal = 0;
      if (Array.isArray(selectedEmp.allowances)) {
        allowancesVal = selectedEmp.allowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
      } else if (typeof selectedEmp.allowances === 'number') {
        allowancesVal = selectedEmp.allowances;
      } else if (typeof selectedEmp.allowances === 'string') {
        try {
          const parsed = JSON.parse(selectedEmp.allowances);
          if (Array.isArray(parsed)) {
            allowancesVal = parsed.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
          }
        } catch {}
      }
      const gross = basic + hra + allowancesVal + bonus;

      const calculatedPt = defaultState ? calculatePT(defaultState, gross) : 0;
      setGenForm(f => ({ ...f, pt_amount: calculatedPt }));
    }
  }, [genForm.employee_id, employees]);

  const handlePtStateChange = (state: string) => {
    setSelectedPtState(state);
    
    if (!genForm.employee_id) {
      setGenForm(f => ({ ...f, pt_amount: 0 }));
      return;
    }

    const selectedEmp = employees.find(e => e.id === (genForm.employee_id as any));
    if (selectedEmp) {
      const basic = Number(selectedEmp.basic_salary) || 0;
      const hra = Number(selectedEmp.hra) || 0;
      const bonus = Number(selectedEmp.bonus) || 0;
      let allowancesVal = 0;
      if (Array.isArray(selectedEmp.allowances)) {
        allowancesVal = selectedEmp.allowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
      } else if (typeof selectedEmp.allowances === 'number') {
        allowancesVal = selectedEmp.allowances;
      } else if (typeof selectedEmp.allowances === 'string') {
        try {
          const parsed = JSON.parse(selectedEmp.allowances);
          if (Array.isArray(parsed)) {
            allowancesVal = parsed.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
          }
        } catch {}
      }
      const gross = basic + hra + allowancesVal + bonus;

      const calculatedPt = state ? calculatePT(state, gross) : 0;
      setGenForm(f => ({ ...f, pt_amount: calculatedPt }));
    }
  };

  const handleIncludePtToggle = () => {
    setGenForm(f => {
      const nextInclude = !f.include_pt;
      let nextAmount = 0;
      if (nextInclude && f.employee_id) {
        const selectedEmp = employees.find(e => e.id === (f.employee_id as any));
        if (selectedEmp) {
          const stateToUse = selectedPtState || selectedEmp.pt_state || '';
          const basic = Number(selectedEmp.basic_salary) || 0;
          const hra = Number(selectedEmp.hra) || 0;
          const bonus = Number(selectedEmp.bonus) || 0;
          let allowancesVal = 0;
          if (Array.isArray(selectedEmp.allowances)) {
            allowancesVal = selectedEmp.allowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
          } else if (typeof selectedEmp.allowances === 'number') {
            allowancesVal = selectedEmp.allowances;
          } else if (typeof selectedEmp.allowances === 'string') {
            try {
              const parsed = JSON.parse(selectedEmp.allowances);
              if (Array.isArray(parsed)) {
                allowancesVal = parsed.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
              }
            } catch {}
          }
          const gross = basic + hra + allowancesVal + bonus;
          nextAmount = stateToUse ? calculatePT(stateToUse, gross) : 0;
        }
      }
      return { ...f, include_pt: nextInclude, pt_amount: nextAmount };
    });
  };

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
    // Load user data (only once — drives loadingUser flag)
    api.get('/user').then(r => setUser(r.data)).catch(console.error).finally(() => setLoadingUser(false));

    // Load settings — module-level cache so we never re-fetch between page navigations
    if (_payrollSettingsCache) {
      setGlobalPfPct(_payrollSettingsCache.pf_percentage);
      setGenForm(f => ({ ...f, pf_percentage: _payrollSettingsCache!.pf_percentage }));
      if (_payrollSettingsCache.company_name) setCompanyName(_payrollSettingsCache.company_name);
    } else {
      api.get('/settings').then(r => {
        const pct = parseFloat(r.data?.pf_percentage ?? '0');
        const name = r.data?.company_name;
        _payrollSettingsCache = { pf_percentage: pct, company_name: name };
        setGlobalPfPct(pct);
        setGenForm(f => ({ ...f, pf_percentage: pct }));
        if (name) { setCompanyName(name); localStorage.setItem('company_name', name); }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load employees + departments for admin filter dropdowns
  // Module-level cache — concurrent callers share one request, result survives navigation
  useEffect(() => {
    if (!isAdmin) return;

    if (_payrollEmployeeCache) {
      setEmployees(_payrollEmployeeCache);
    } else if (!_payrollEmployeePending) {
      _payrollEmployeePending = api.get('/employees', { params: { per_page: 500 } })
        .then(r => { const d = r.data.data ?? []; _payrollEmployeeCache = d; setEmployees(d); return d; })
        .catch(e => { console.error(e); return []; })
        .finally(() => { _payrollEmployeePending = null; });
    } else {
      // Already fetching — attach to the pending promise
      _payrollEmployeePending.then(d => setEmployees(d));
    }

    if (_payrollDeptCache) {
      setDepartments(_payrollDeptCache);
    } else if (!_payrollDeptPending) {
      _payrollDeptPending = api.get('/departments', { params: { per_page: 100 } })
        .then(r => { const d = r.data.data ?? []; _payrollDeptCache = d; setDepartments(d); return d; })
        .catch(e => { console.error(e); return []; })
        .finally(() => { _payrollDeptPending = null; });
    } else {
      _payrollDeptPending.then(d => setDepartments(d));
    }
  }, [isAdmin]);

  async function loadData(p = 1) {
    setLoadingData(true);
    try {
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
  }, [loadingUser]);

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
    setSelectedPtState('');
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

    if (genForm.employee_id === 'all') {
      const activeEmps = employees.filter(e => e.status === 'active' || !e.status || e.status === '');
      if (activeEmps.length === 0) {
        toast.error('No active employees found to generate payroll for.');
        return;
      }

      setGenerating(true);
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < activeEmps.length; i++) {
        const emp = activeEmps[i];
        setBulkProgress({ current: i + 1, total: activeEmps.length, employeeName: `${emp.first_name} ${emp.last_name}` });

        // Calculate gross salary
        const basic = Number(emp.basic_salary) || 0;
        const hra = Number(emp.hra) || 0;
        const bonus = Number(emp.bonus) || 0;
        let allowancesVal = 0;
        if (Array.isArray(emp.allowances)) {
          allowancesVal = emp.allowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
        } else if (typeof emp.allowances === 'number') {
          allowancesVal = emp.allowances;
        } else if (typeof emp.allowances === 'string') {
          try {
            const parsed = JSON.parse(emp.allowances);
            if (Array.isArray(parsed)) {
              allowancesVal = parsed.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
            }
          } catch {}
        }
        const gross = basic + hra + allowancesVal + bonus;

        // Calculate PT amount
        const ptState = emp.pt_state || '';
        const empPtAmount = (genForm.include_pt && ptState) ? calculatePT(ptState, gross) : 0;

        const empPayload = {
          employee_id: emp.id,
          month: genForm.month,
          year: genForm.year,
          include_pf: genForm.include_pf,
          include_pt: genForm.include_pt,
          pf_percentage: genForm.pf_percentage,
          pt_amount: empPtAmount,
        };

        try {
          await api.post('/payrolls/generate', empPayload);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to generate payroll for ${emp.first_name}:`, err);
          failCount++;
        }
      }

      setGenerating(false);
      setBulkProgress(null);
      setShowGenModal(false);
      loadData(1);

      if (failCount === 0) {
        toast.success(`Successfully generated payroll for all ${successCount} employees.`);
      } else {
        toast.warning(`Generated payroll: ${successCount} succeeded, ${failCount} failed.`);
      }
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

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/payrolls/${id}`);
      toast.success('Payroll record deleted successfully.');
      loadData(page);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete payroll record.');
    } finally {
      setDeletingId(null);
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
            {isAdmin ? 'Manage payroll records and process employee salaries' : 'View your historical pay statements'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={openGenModal} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition shadow-sm">
              <Plus size={15} /> Generate Payroll
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards - Admin Only */}
      {isAdmin && (
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

      {/* Bulk Action Bar - Admin Only */}
      {isAdmin && selectedIds.length > 0 && (
        <BulkActionBar 
          selectedIds={selectedIds} 
          onMarkPaid={handleBulkMarkPaid} 
          onSendEmail={handleBulkSendEmail} 
          onClear={() => setSelectedIds([])} 
          loading={bulkLoading} 
          allSelectedArePaid={allSelectedArePaid}
        />
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : (
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
                      deletingId={deletingId}
                      selected={selectedIds.includes(p.id)}
                      onSelect={handleSelectOne}
                      onMarkPaid={markPaid}
                      onEmail={sendEmail}
                      onViewPayslip={openPayslip}
                      onDelete={handleDelete}
                    />
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
              {bulkProgress ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-semibold text-slate-800">Generating Payroll Records...</h3>
                    <p className="text-xs text-slate-400">Processing: <span className="font-medium text-slate-600">{bulkProgress.employeeName}</span></p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 max-w-xs mt-2 relative overflow-hidden">
                    <div 
                      className="bg-slate-800 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} 
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {bulkProgress.current} of {bulkProgress.total} employees completed
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Employee</label>
                    <SearchableSelect
                      options={[
                        { id: 0, label: 'Select employee' },
                        { id: 'all' as any, label: 'All Active Employees' },
                        ...employees.map(e => ({
                          id: e.id,
                          label: `${e.first_name} ${e.last_name}`,
                          sublabel: e.department?.name ? e.department.name : undefined
                        }))
                      ]}
                      value={genForm.employee_id === 0 ? '' : genForm.employee_id}
                      onChange={(val: any) => {
                        setGenForm(f => ({ ...f, employee_id: val === '' ? 0 : val === 'all' ? 'all' : Number(val) }));
                      }}
                      disabled={loadingEmps}
                      placeholder={loadingEmps ? 'Loading...' : 'Select employee'}
                    />
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
                          onClick={handleIncludePtToggle}
                          className={`relative w-11 h-6 rounded-full transition-colors ${genForm.include_pt ? 'bg-slate-800' : 'bg-slate-300'}`}>
                          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${genForm.include_pt ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                      {genForm.include_pt && (
                        <div className="px-4 pb-3 pt-3 border-t border-slate-200 space-y-3">
                          {genForm.employee_id === 'all' ? (
                            <p className="text-xs text-slate-500 leading-normal flex items-start gap-1.5">
                              <span className="text-slate-500">💡</span>
                              <span>Professional Tax (PT) will be calculated automatically for each employee based on their configured state and gross salary.</span>
                            </p>
                          ) : (
                            <>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">PT State</label>
                                <div className="relative">
                                  <select value={selectedPtState}
                                    onChange={e => handlePtStateChange(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8">
                                    <option value="">Select State</option>
                                    {PT_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                                  </select>
                                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">PT Amount</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    readOnly
                                    value={genForm.pt_amount ?? 0}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                                    placeholder="₹0"
                                  />
                                </div>
                                {Number(genForm.employee_id) > 0 && (() => {
                                  const selectedEmp = employees.find(e => e.id === genForm.employee_id);
                                  if (!selectedEmp) return null;
                                  const basic = Number(selectedEmp.basic_salary) || 0;
                                  const hra = Number(selectedEmp.hra) || 0;
                                  const bonus = Number(selectedEmp.bonus) || 0;
                                  let allowancesVal = 0;
                                  if (Array.isArray(selectedEmp.allowances)) {
                                    allowancesVal = selectedEmp.allowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
                                  } else if (typeof selectedEmp.allowances === 'number') {
                                    allowancesVal = selectedEmp.allowances;
                                  } else if (typeof selectedEmp.allowances === 'string') {
                                    try {
                                      const parsed = JSON.parse(selectedEmp.allowances);
                                      if (Array.isArray(parsed)) {
                                        allowancesVal = parsed.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
                                      }
                                    } catch {}
                                  }
                                  const gross = basic + hra + allowancesVal + bonus;
                                  return (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Employee Gross Salary: <span className="font-semibold text-slate-600">₹{gross.toLocaleString('en-IN')}</span>
                                    </p>
                                  );
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              {!bulkProgress && (
                <>
                  <button onClick={() => setShowGenModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleGenerate} disabled={generating || !genForm.employee_id} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </>
              )}
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