'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Employee } from '@/types/employee';
import { Department } from '@/types/department';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  ArrowLeft, Loader2, Save, AlertCircle, User,
  Briefcase, CreditCard, Banknote, Heart, FileBadge,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

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

function isNoPTState(state: string): boolean {
  return PT_SLABS[state]?.every(s => s.pt === 0) ?? false;
}

function calculatePT(state: string, gross: number): number {
  const slabs = PT_SLABS[state];
  if (!slabs) return 0;
  for (const slab of slabs) {
    if (gross <= slab.upTo) return slab.pt;
  }
  return 0;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const selectCls = 'w-full h-9 border border-slate-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
      aria-label={label}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-slate-500" />}
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

function FormField({ label, required, error, children, hint }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 leading-tight">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

const ALLOWANCE_TYPES = ['transport', 'food', 'medical', 'other'] as const;

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;
  const queryClient = useQueryClient();
  const { hasPermission, user, hasRole } = useAuthStore();
  const isOwnProfile = user?.employee_id === Number(employeeId) || user?.employee?.id === Number(employeeId);
  const isAdminOrHR = hasRole('admin') || hasRole('super_admin') || hasRole('super admin') || hasRole('hr');
  const canEdit = hasPermission('edit employees') || isOwnProfile;
  const isRestrictedSelfEdit = isOwnProfile && !isAdminOrHR;
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterByDept, setFilterByDept] = useState(true);

  const [allowancesState, setAllowancesState] = useState({
    transport: false, food: false, medical: false, special: false, other: false,
  });
  const [esiEnabled, setEsiEnabled] = useState(false);
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [hraPercentage, setHraPercentage] = useState<number>(0);
  const [ctcInput, setCtcInput] = useState<string>('');
  const [isCtcFocused, setIsCtcFocused] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', gender: '' as '',
    blood_group: '' as '', dob: '', official_dob: '', address: '', city: '', state: '', country: 'India', pincode: '',
    department_id: '' as number | '', designation_id: '' as number | '', reporting_to: '' as number | '',
    joining_date: '', exit_date: '',
    employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'intern',
    status: 'active' as 'active' | 'inactive' | 'terminated',
    pan_number: '', aadhaar_number: '', driving_license: '', passport_number: '', voter_id: '', uan_number: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    bank_name: '', bank_account_number: '', bank_ifsc: '', bank_branch: '',
    basic_salary: 0, hra: 0, bonus: 0,
    allowances: [] as Array<{ type: string; amount: number }>,
    pf_percentage: 0, pf_deduction: 0,
    esi_employee: 0, esi_employer: 0,
    pt_state: '', pt_amount: 0,
    tds_amount: 0, other_deductions: 0, ctc: 0,
  });

  useEffect(() => setMounted(true), []);

  const { data: managers = [] } = useQuery<any[]>({
    queryKey: ['managers'],
    queryFn: async () => { const r = await api.get('/employees/managers'); return r.data.data || r.data || []; },
  });

  const { data: employee, isLoading: loadingEmployee } = useQuery<any>({
    queryKey: ['employee', employeeId],
    queryFn: async () => { const res = await api.get(`/employees/${employeeId}`); return res.data.data; },
    enabled: !!employeeId,
  });

  const { data: deptsRes } = useQuery<{ data: Department[] }>({
    queryKey: ['departments'],
    queryFn: async () => { const r = await api.get('/departments', { params: { per_page: 100 } }); return r.data; },
  });
  const departments = deptsRes?.data || [];

  const { data: desigsRes } = useQuery({
    queryKey: ['designations', formData.department_id],
    queryFn: async () => {
      const url = formData.department_id ? `/designations?department_id=${formData.department_id}` : '/designations';
      const r = await api.get(url);
      return r.data.data;
    },
    enabled: mounted && !!formData.department_id,
  });
  const designations = desigsRes || [];

  useEffect(() => {
    if (!employee) return;

    const allowancesMap = { transport: false, food: false, medical: false, special: false, other: false };
    let allowancesArray: Array<{ type: string; amount: number }> = [];
    let rawAllowances = employee.allowances;
    if (typeof rawAllowances === 'string') {
      try { rawAllowances = JSON.parse(rawAllowances); } catch { rawAllowances = []; }
    }
    if (Array.isArray(rawAllowances)) {
      allowancesArray = rawAllowances;
      rawAllowances.forEach((a: any) => {
        if (allowancesMap[a.type as keyof typeof allowancesMap] !== undefined)
          allowancesMap[a.type as keyof typeof allowancesMap] = true;
      });
    } else if (typeof rawAllowances === 'number' && rawAllowances > 0) {
      allowancesArray = [{ type: 'other', amount: rawAllowances }];
      allowancesMap.other = true;
    }
    setAllowancesState(allowancesMap);

    const esiEmp  = Number(employee.esi_employee) || 0;
    const esiEmpr = Number(employee.esi_employer) || 0;
    const tds     = Number(employee.tds_amount)   || 0;
    setEsiEnabled(esiEmp > 0 || esiEmpr > 0);
    setTdsEnabled(tds > 0);

    const basicVal = Number(employee.basic_salary) || 0;
    const hraVal   = Number(employee.hra) || 0;
    setHraPercentage(basicVal > 0 ? Math.round((hraVal / basicVal) * 100) : 0);

    setFormData({
      first_name: employee.first_name || '', last_name: employee.last_name || '',
      email: employee.email || '', phone: employee.phone || '',
      gender: employee.gender || '', blood_group: employee.blood_group || '',
      dob: employee.dob || '', official_dob: employee.official_dob || '', address: employee.address || '',
      city: employee.city || '', state: employee.state || '',
      country: employee.country || 'India', pincode: employee.pincode || '',
      department_id: employee.department_id || '', designation_id: employee.designation_id || '',
      reporting_to: employee.reporting_to || '',
      joining_date: employee.joining_date || '', exit_date: employee.exit_date || '',
      employment_type: employee.employment_type || 'full_time',
      status: employee.status || 'active',
      pan_number: employee.pan_number || '', aadhaar_number: employee.aadhaar_number || '',
      driving_license: employee.driving_license || '', passport_number: employee.passport_number || '',
      voter_id: employee.voter_id || '', uan_number: employee.uan_number || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      emergency_contact_relation: employee.emergency_contact_relation || '',
      bank_name: employee.bank_name || '', bank_account_number: employee.bank_account_number || '',
      bank_ifsc: employee.bank_ifsc || '', bank_branch: employee.bank_branch || '',
      basic_salary: Number(employee.basic_salary) || 0,
      hra: Number(employee.hra) || 0, bonus: Number(employee.bonus) || 0,
      allowances: allowancesArray,
      pf_percentage: Number(employee.pf_percentage) ?? 0,
      pf_deduction: Number(employee.pf_deduction) || 0,
      esi_employee: esiEmp, esi_employer: esiEmpr,
      pt_state: employee.pt_state || '', pt_amount: Number(employee.pt_amount) || 0,
      tds_amount: tds, other_deductions: Number(employee.other_deductions) || 0,
      ctc: Number(employee.ctc) || 0,
    });
  }, [employee]);

  const handleHraAmountChange = (valStr: string) => {
    const val = Number(valStr) || 0;
    setFormData(prev => {
      if (prev.basic_salary > 0) {
        const pct = Math.round((val / prev.basic_salary) * 100);
        setHraPercentage(pct);
      }
      return { ...prev, hra: val };
    });
  };

  const handleSpecialAllowanceChange = (valStr: string) => {
    const val = Number(valStr) || 0;
    setFormData(prev => {
      const exists = prev.allowances.find((a: any) => a.type === 'special');
      const newAllowances = exists
        ? prev.allowances.map((a: any) => a.type === 'special' ? { ...a, amount: val } : a)
        : [...prev.allowances, { type: 'special', amount: val }];
      return { ...prev, allowances: newAllowances };
    });
  };

  const toggleAllowance = (type: string, enabled: boolean) => {
    setAllowancesState(prev => ({ ...prev, [type]: enabled }));
    if (!enabled)
      setFormData(prev => ({ ...prev, allowances: prev.allowances.filter((a: any) => a.type !== type) }));
    else
      setFormData(prev => ({ ...prev, allowances: [...prev.allowances, { type, amount: 0 }] }));
  };
  const getAllowanceAmount = (type: string) => formData.allowances.find((a: any) => a.type === type)?.amount || '';
  const updateAllowanceAmount = (type: string, amount: number) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.map((a: any) => a.type === type ? { ...a, amount } : a),
    }));
  };
  const totalAllowances = formData.allowances.reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);

  const handleEsiToggle = (enabled: boolean) => {
    setEsiEnabled(enabled);
    if (!enabled) {
      setFormData(prev => ({ ...prev, esi_employee: 0, esi_employer: 0 }));
    } else {
      const gross = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
      if (gross <= 21000) {
        setFormData(prev => ({
          ...prev,
          esi_employee: Math.round(gross * 0.0075),
          esi_employer: Math.round(gross * 0.0325),
        }));
      }
    }
  };

  const handleTdsToggle = (enabled: boolean) => {
    setTdsEnabled(enabled);
    if (!enabled) setFormData(prev => ({ ...prev, tds_amount: 0 }));
  };

  useEffect(() => {
    if (esiEnabled) {
      const gross = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
      if (gross <= 21000) {
        setFormData(prev => ({
          ...prev,
          esi_employee: Math.round(gross * 0.0075),
          esi_employer: Math.round(gross * 0.0325),
        }));
      } else {
        setFormData(prev => ({ ...prev, esi_employee: 0, esi_employer: 0 }));
      }
    }
  }, [esiEnabled, formData.basic_salary, formData.hra, totalAllowances, formData.bonus]);

  useEffect(() => {
    const gross = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
    setFormData(prev => ({ ...prev, pf_deduction: Math.round((gross * (prev.pf_percentage || 0)) / 100) }));
  }, [formData.basic_salary, formData.hra, formData.bonus, formData.pf_percentage, totalAllowances]);

  useEffect(() => {
    const gross = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
    const calculatedPt = formData.pt_state ? calculatePT(formData.pt_state, gross) : 0;
    setFormData(prev => ({ ...prev, pt_amount: calculatedPt }));
  }, [formData.pt_state, formData.basic_salary, formData.hra, formData.bonus, totalAllowances]);

  useEffect(() => {
    const gross = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
    const computedEsiEmployer = esiEnabled && gross <= 21000 ? Math.round(gross * 0.0325) : 0;
    const computedPfDeduction = Math.round((gross * (formData.pf_percentage || 0)) / 100);
    const computedMonthlyCtc = gross + computedEsiEmployer + computedPfDeduction;
    setFormData(prev => {
      if (prev.ctc !== computedMonthlyCtc) {
        return { ...prev, ctc: computedMonthlyCtc };
      }
      return prev;
    });
  }, [formData.basic_salary, formData.hra, totalAllowances, formData.bonus, esiEnabled, formData.pf_percentage]);

  useEffect(() => {
    if (isCtcFocused) return;
    const roundedCtc = Math.round(formData.ctc * 12);
    if (roundedCtc !== Number(ctcInput)) {
      setCtcInput(roundedCtc > 0 ? String(roundedCtc) : '');
    }
  }, [formData.ctc, ctcInput, isCtcFocused]);

  const handleAnnualCTCChange = (valStr: string) => {
    setCtcInput(valStr);
    const val = Number(valStr);
    if (!isNaN(val) && val > 0) {
      const monthlyCTC = val / 12;
      
      if (formData.employment_type === 'intern') {
        const stipend = Math.round(monthlyCTC);
        setAllowancesState({ transport: false, food: false, medical: false, special: false, other: false });
        setFormData(prev => ({
          ...prev,
          basic_salary: stipend,
          hra: 0,
          bonus: 0,
          allowances: [],
          ctc: Math.round(monthlyCTC),
        }));
      } else {
        let calculatedGross = 0;
        if (esiEnabled) {
          const factorWithEsi = 1 + (formData.pf_percentage / 100) + 0.0325;
          const grossWithEsi = monthlyCTC / factorWithEsi;
          if (grossWithEsi <= 21000) {
            calculatedGross = grossWithEsi;
          } else {
            const factorWithoutEsi = 1 + (formData.pf_percentage / 100);
            calculatedGross = monthlyCTC / factorWithoutEsi;
          }
        } else {
          const factorWithoutEsi = 1 + (formData.pf_percentage / 100);
          calculatedGross = monthlyCTC / factorWithoutEsi;
        }

        calculatedGross = Math.round(calculatedGross);

        const calculatedBasic = Math.round(calculatedGross * 0.50);
        setHraPercentage(40);
        const calculatedHra = Math.round(calculatedBasic * 0.40);
        const calculatedSpecial = Math.max(0, calculatedGross - calculatedBasic - calculatedHra);

        setAllowancesState({
          transport: false,
          food: false,
          medical: false,
          special: calculatedSpecial > 0,
          other: false,
        });

        setFormData(prev => ({
          ...prev,
          basic_salary: calculatedBasic,
          hra: calculatedHra,
          bonus: 0,
          allowances: calculatedSpecial > 0 ? [{ type: 'special', amount: calculatedSpecial }] : [],
          ctc: Math.round(monthlyCTC),
        }));
      }
    } else {
      setAllowancesState({
        transport: false, food: false, medical: false, special: false, other: false,
      });
      setFormData(prev => ({
        ...prev,
        basic_salary: 0,
        hra: 0,
        bonus: 0,
        allowances: [],
        ctc: 0,
      }));
    }
  };

  useEffect(() => {
    if (ctcInput && Number(ctcInput) > 0) {
      handleAnnualCTCChange(ctcInput);
    }
  }, [formData.pf_percentage, esiEnabled, formData.employment_type]);

  useEffect(() => {
    if (formData.employment_type === 'intern') {
      setAllowancesState({ transport: false, food: false, medical: false, special: false, other: false });
      setFormData(prev => ({
        ...prev,
        hra: 0,
        bonus: 0,
        allowances: [],
        pf_percentage: 0,
        pf_deduction: 0,
        esi_employee: 0,
        esi_employer: 0,
        pt_state: '',
        pt_amount: 0,
        tds_amount: 0,
        other_deductions: 0,
      }));
      setHraPercentage(0);
      setEsiEnabled(false);
      setTdsEnabled(false);
    } else {
      setFormData(prev => {
        if (!prev.pt_state) {
          return { ...prev, pt_state: 'Telangana' };
        }
        return prev;
      });
    }
  }, [formData.employment_type]);

  const grossSalary = formData.basic_salary + formData.hra + totalAllowances + formData.bonus;
  const showFullStructure = formData.employment_type === 'full_time';
  const esiApplicable = grossSalary <= 21000;
  const totalDeductions =
    (formData.pf_deduction || 0) +
    (esiEnabled ? formData.esi_employee || 0 : 0) +
    (formData.pt_amount || 0) +
    (tdsEnabled ? formData.tds_amount || 0 : 0) +
    (formData.other_deductions || 0);
  const netSalary = grossSalary - totalDeductions;
  const annualCTC = formData.ctc * 12;
  const ptHasNoApplicable = formData.pt_state && isNoPTState(formData.pt_state);

  const reportingOptions = managers.filter((m: any) => {
    if (filterByDept && formData.department_id) return m.department_id === formData.department_id;
    return true;
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.put(`/employees/${employeeId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      router.push(`/employees/${employeeId}`);
    },
    onError: (err: any) => {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      setIsSubmitting(false);
    },
  });

  const handleChange = (field: string, value: any) => {
    if (field === 'basic_salary') {
      const basicVal = Number(value) || 0;
      const calculatedHra = Math.round((basicVal * hraPercentage) / 100);
      setFormData(prev => ({ ...prev, basic_salary: basicVal, hra: calculatedHra }));
    } else if (field === 'employment_type') {
      const prevType = formData.employment_type;
      const nextType = value;
      setFormData(prev => {
        const updated = { ...prev, employment_type: nextType };
        if (prevType === 'intern' && nextType !== 'intern') {
          const stipend = prev.basic_salary || 0;
          if (stipend > 0) {
            const basic = Math.round(stipend * 0.50);
            const hra = Math.round(basic * 0.40);
            const special = Math.max(0, stipend - basic - hra);
            
            setHraPercentage(40);
            setAllowancesState({
              transport: false,
              food: false,
              medical: false,
              special: special > 0,
              other: false,
            });
            
            updated.basic_salary = basic;
            updated.hra = hra;
            updated.allowances = special > 0 ? [{ type: 'special', amount: special }] : [];
            
            const gross = basic + hra + special;
            const computedEsiEmployer = esiEnabled && gross <= 21000 ? Math.round(gross * 0.0325) : 0;
            const computedPfDeduction = Math.round((gross * (prev.pf_percentage || 0)) / 100);
            const computedMonthlyCtc = gross + computedEsiEmployer + computedPfDeduction;
            updated.ctc = computedMonthlyCtc;
            setCtcInput(String(computedMonthlyCtc * 12));
          }
        }
        return updated;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canEdit) return;

    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.joining_date) newErrors.joining_date = 'Joining date is required';
    if (!formData.department_id) newErrors.department_id = 'Department is required';
    if (!formData.designation_id) newErrors.designation_id = 'Designation is required';

    // Format validation if filled
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      newErrors.pan_number = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number)) {
      newErrors.aadhaar_number = 'Aadhaar must be 12 digits';
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    setErrors({});
    const payload = {
      ...formData,
      esi_employee: esiEnabled ? formData.esi_employee : 0,
      esi_employer: esiEnabled ? formData.esi_employer : 0,
      tds_amount: tdsEnabled ? formData.tds_amount : 0,
    };
    await updateMutation.mutateAsync(payload);
  };

  if (!mounted || loadingEmployee) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!employee) {
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

  if (mounted && !canEdit) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-slate-600">Unauthorized access</p>
        <Link href={`/employees/${employeeId}`} className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href={`/employees/${employeeId}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="text-base font-bold text-slate-800">Edit Employee</h2>
            <p className="text-xs text-slate-500">{(employee as any).employee_code} • {(employee as any).full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-8 px-3 text-sm">Cancel</Button>
          <Button type="button" onClick={() => handleSubmit()} disabled={isSubmitting}
            className="h-8 bg-blue-600 hover:bg-blue-500 text-white px-4 gap-1.5 text-sm">
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            <Save size={13} /> Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Personal Information */}
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField label="First Name" required error={errors.first_name}>
              <Input value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Last Name" required error={errors.last_name}>
              <Input value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Phone">
              <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Gender">
              <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className={selectCls}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FormField>
            <FormField label="Blood Group">
              <select value={formData.blood_group} onChange={(e) => handleChange('blood_group', e.target.value)} className={selectCls}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </FormField>
            <FormField label="Birthday">
              <Input type="date" value={formData.dob} onChange={(e) => handleChange('dob', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={formData.official_dob} onChange={(e) => handleChange('official_dob', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Country">
              <Input value={formData.country} onChange={(e) => handleChange('country', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="State">
              <Input value={formData.state} onChange={(e) => handleChange('state', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="City">
              <Input value={formData.city} onChange={(e) => handleChange('city', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Pincode">
              <Input value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)} className="h-9" />
            </FormField>
            <div className="md:col-span-2 lg:col-span-3">
              <FormField label="Address">
                <textarea value={formData.address} onChange={(e) => handleChange('address', e.target.value)}
                  rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Identity Documents */}
        <SectionCard title="Identity Documents" icon={FileBadge}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="PAN Number" required error={errors.pan_number} hint="Format: ABCDE1234F">
              <Input value={formData.pan_number} onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F" className="h-9 uppercase" maxLength={10} disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Aadhaar Number" required error={errors.aadhaar_number} hint="12 digits only">
              <Input value={formData.aadhaar_number} onChange={(e) => handleChange('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="123456789012" className="h-9" maxLength={12} disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Driving License">
              <Input value={formData.driving_license} onChange={(e) => handleChange('driving_license', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Passport Number">
              <Input value={formData.passport_number} onChange={(e) => handleChange('passport_number', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Voter ID">
              <Input value={formData.voter_id} onChange={(e) => handleChange('voter_id', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="UAN (EPF)">
              <Input value={formData.uan_number} onChange={(e) => handleChange('uan_number', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
          </div>
        </SectionCard>

        {/* Employment Details */}
        <SectionCard title="Employment Details" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField label="Department" required error={errors.department_id}>
              <SearchableSelect
                options={[
                  { id: '' as any, label: 'Select Department' },
                  ...departments.map(d => ({
                    id: d.id,
                    label: d.name
                  }))
                ]}
                value={formData.department_id || ''}
                onChange={(val) => {
                  handleChange('department_id', val === '' ? '' : Number(val));
                  handleChange('designation_id', '');
                }}
                placeholder="Select Department"
                disabled={isRestrictedSelfEdit}
              />
            </FormField>
            <FormField label="Designation" required error={errors.designation_id}>
              <SearchableSelect
                options={[
                  { id: '' as any, label: formData.department_id ? 'Select Designation' : 'Select department first' },
                  ...designations.map((d: any) => ({
                    id: d.id,
                    label: d.title
                  }))
                ]}
                value={formData.designation_id || ''}
                onChange={(val) => {
                  handleChange('designation_id', val === '' ? '' : Number(val));
                }}
                placeholder={formData.department_id ? 'Select Designation' : 'Select department first'}
                disabled={isRestrictedSelfEdit || !formData.department_id}
              />
            </FormField>
            <FormField label="Reporting To">
              <div className="space-y-1">
                {formData.department_id && !isRestrictedSelfEdit && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setFilterByDept(p => !p)}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        filterByDept ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <span className={`w-5 h-3 rounded-full flex items-center transition-colors ${filterByDept ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <span className={`w-2 h-2 bg-white rounded-full shadow transition-transform mx-0.5 ${filterByDept ? 'translate-x-2' : 'translate-x-0'}`} />
                      </span>
                      {filterByDept ? 'This dept only' : 'All depts'}
                    </button>
                  </div>
                )}
                <SearchableSelect
                  options={[
                    { id: '' as any, label: 'None' },
                    ...reportingOptions.map((m: any) => ({
                      id: m.id,
                      label: m.full_name,
                      sublabel: (m.designation?.title ? m.designation.title : '') + 
                                (!filterByDept && m.department?.name ? ` (${m.department.name})` : '')
                    }))
                  ]}
                  value={formData.reporting_to || ''}
                  onChange={(val) => handleChange('reporting_to', val === '' ? '' : Number(val))}
                  placeholder="Select reporting manager"
                  disabled={isRestrictedSelfEdit}
                />
              </div>
            </FormField>
            <FormField label="Joining Date" required error={errors.joining_date}>
              <Input type="date" value={formData.joining_date} onChange={(e) => handleChange('joining_date', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Exit Date">
              <Input type="date" value={formData.exit_date} onChange={(e) => handleChange('exit_date', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Employment Type">
              <select value={formData.employment_type} onChange={(e) => handleChange('employment_type', e.target.value)} className={selectCls} disabled={isRestrictedSelfEdit}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className={selectCls} disabled={isRestrictedSelfEdit}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </FormField>
          </div>
        </SectionCard>

        {/* Emergency Contact — mandatory */}
        <SectionCard title="Emergency Contact" icon={Heart}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Contact Name" required error={errors.emergency_contact_name}>
              <Input value={formData.emergency_contact_name}
                onChange={(e) => handleChange('emergency_contact_name', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Contact Phone" required error={errors.emergency_contact_phone}>
              <Input value={formData.emergency_contact_phone}
                onChange={(e) => handleChange('emergency_contact_phone', e.target.value)} className="h-9" />
            </FormField>
            <FormField label="Relationship">
              <Input value={formData.emergency_contact_relation}
                onChange={(e) => handleChange('emergency_contact_relation', e.target.value)}
                placeholder="e.g., Spouse, Parent" className="h-9" />
            </FormField>
          </div>
        </SectionCard>

        {/* Bank Details */}
        <SectionCard title="Bank Details" icon={CreditCard}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FormField label="Bank Name" required error={errors.bank_name}>
              <Input value={formData.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Account Number" required error={errors.bank_account_number}>
              <Input value={formData.bank_account_number} onChange={(e) => handleChange('bank_account_number', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="IFSC Code" required error={errors.bank_ifsc}>
              <Input value={formData.bank_ifsc} onChange={(e) => handleChange('bank_ifsc', e.target.value.toUpperCase())}
                className="h-9 uppercase" placeholder="SBIN0001234" disabled={isRestrictedSelfEdit} />
            </FormField>
            <FormField label="Branch">
              <Input value={formData.bank_branch} onChange={(e) => handleChange('bank_branch', e.target.value)} className="h-9" disabled={isRestrictedSelfEdit} />
            </FormField>
          </div>
        </SectionCard>

        {!isRestrictedSelfEdit && (
          <SectionCard title="Salary Structure" icon={Banknote}>
            <div className="space-y-4">

              {/* Annual CTC Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-slate-100 pb-3">
                <FormField label="Annual CTC" hint="Enter target annual CTC to auto-fill components">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <Input
                      type="number"
                      placeholder="e.g. 360000"
                      value={ctcInput}
                      onFocus={() => setIsCtcFocused(true)}
                      onBlur={() => setIsCtcFocused(false)}
                      onChange={(e) => handleAnnualCTCChange(e.target.value)}
                      className="h-9 pl-7 focus:ring-blue-500/20"
                    />
                  </div>
                </FormField>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Earnings (Monthly)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormField label={formData.employment_type === 'intern' ? 'Stipend' : 'Basic Salary'}>
                    <Input type="number" value={formData.basic_salary || 0} onChange={(e) => handleChange('basic_salary', Number(e.target.value))} className="h-9" min={0} step="0.01" />
                  </FormField>
                  {showFullStructure && (
                    <>
                      <FormField label={`HRA (${hraPercentage}%)`}>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.hra || ''}
                            onChange={(e) => handleHraAmountChange(e.target.value)}
                            className="h-9 pl-7"
                          />
                        </div>
                      </FormField>
                      <FormField label="Special Allowance">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.allowances.find((a: any) => a.type === 'special')?.amount || ''}
                            onChange={(e) => handleSpecialAllowanceChange(e.target.value)}
                            className="h-9 pl-7"
                          />
                        </div>
                      </FormField>
                      <FormField label="Bonus">
                        <Input type="number" value={formData.bonus || 0} onChange={(e) => handleChange('bonus', Number(e.target.value))} className="h-9" min={0} step="0.01" />
                      </FormField>
                    </>
                  )}
                </div>
                {showFullStructure && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Gross (before allowances): <span className="font-semibold text-slate-700">{formatCurrency(formData.basic_salary + formData.hra + formData.bonus)}</span>/month
                  </p>
                )}
              </div>

              {showFullStructure && (
                <>
                  {/* Allowances — 2 per row grid */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Allowances</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        {ALLOWANCE_TYPES.map((type, idx) => (
                          <div
                            key={type}
                            className={`flex items-center justify-between px-3 py-2 bg-white
                              ${idx % 2 === 0 && idx !== ALLOWANCE_TYPES.length - 1 ? 'md:border-r border-slate-100' : ''}
                              ${idx < ALLOWANCE_TYPES.length - (ALLOWANCE_TYPES.length % 2 === 0 ? 2 : 1) ? 'border-b border-slate-100' : ''}
                              ${idx === ALLOWANCE_TYPES.length - 1 && ALLOWANCE_TYPES.length % 2 !== 0 ? 'md:col-span-2' : ''}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`allowance-${type}`}
                                checked={allowancesState[type]}
                                onChange={(e) => toggleAllowance(type, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`allowance-${type}`} className="text-sm font-medium text-slate-700 capitalize">
                                {type} Allowance
                              </label>
                            </div>
                            {allowancesState[type] && (
                              <Input
                                type="number"
                                placeholder="₹ Amount"
                                value={getAllowanceAmount(type)}
                                onChange={(e) => updateAllowanceAmount(type, Number(e.target.value))}
                                className="w-28 h-7 text-sm"
                                min={0}
                                step="0.01"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      {totalAllowances > 0 && (
                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-sm text-slate-500">Total Allowances</span>
                          <span className="text-sm font-semibold text-blue-600">{formatCurrency(totalAllowances)}/month</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Deductions (Monthly)</h4>
                    <div className="space-y-2">

                      {/* PF row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <FormField label="PF Percentage">
                          <div className="flex gap-2">
                            <select value={formData.pf_percentage}
                              onChange={(e) => handleChange('pf_percentage', Number(e.target.value))}
                              className="w-20 h-9 border border-slate-300 rounded-lg px-2 text-sm bg-white">
                              {Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i}%</option>)}
                            </select>
                            <Input readOnly value={formatCurrency(formData.pf_deduction)} className="h-9 bg-slate-50 flex-1" />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formData.pf_percentage === 0 ? 'No PF' : `${formData.pf_percentage}% = ${formatCurrency(formData.pf_deduction)}/mo`}
                          </p>
                        </FormField>
                      </div>

                      {/* ESI Toggle */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                          <div>
                            <p className="text-sm font-medium text-slate-700">ESI (Employee State Insurance)</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {!esiApplicable ? 'Not applicable — gross > ₹21,000' : '0.75% employee · 3.25% employer'}
                            </p>
                          </div>
                          <Toggle enabled={esiEnabled} onChange={handleEsiToggle} label="Toggle ESI" />
                        </div>
                        {esiEnabled && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormField label="ESI (Employee)" hint="0.75% of gross">
                              <Input type="number" value={formData.esi_employee || 0}
                                onChange={(e) => handleChange('esi_employee', Number(e.target.value))}
                                className="h-9" min={0} step="0.01" />
                            </FormField>
                            <FormField label="ESI (Employer)" hint="3.25% of gross">
                              <Input type="number" value={formData.esi_employer || 0}
                                onChange={(e) => handleChange('esi_employer', Number(e.target.value))}
                                className="h-9" min={0} step="0.01" />
                            </FormField>
                          </div>
                        )}
                      </div>

                      {/* PT row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="PT State">
                          <select value={formData.pt_state} onChange={(e) => handleChange('pt_state', e.target.value)}
                            className={`w-full h-9 border rounded-lg px-3 text-sm bg-white ${ptHasNoApplicable ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}>
                            <option value="">Select state for PT</option>
                            {PT_STATES.map(s => <option key={s} value={s}>{s}{isNoPTState(s) ? ' (No PT)' : ''}</option>)}
                          </select>
                          {ptHasNoApplicable && <p className="text-xs text-red-500 mt-0.5">⚠️ No PT in {formData.pt_state}</p>}
                          {formData.pt_state && !ptHasNoApplicable && formData.pt_amount === 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">Below PT threshold</p>
                          )}
                        </FormField>
                        <FormField label="PT Amount">
                          <Input type="number" value={formData.pt_amount || 0}
                            onChange={(e) => handleChange('pt_amount', Number(e.target.value))}
                            className="h-9" min={0} step="0.01" />
                        </FormField>
                      </div>

                      {/* TDS Toggle */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                          <div>
                            <p className="text-sm font-medium text-slate-700">TDS (Tax Deducted at Source)</p>
                            <p className="text-xs text-slate-500 mt-0.5">Monthly income tax deduction</p>
                          </div>
                          <Toggle enabled={tdsEnabled} onChange={handleTdsToggle} label="Toggle TDS" />
                        </div>
                        {tdsEnabled && (
                          <div className="p-3">
                            <FormField label="TDS Amount (Monthly)" hint="Monthly TDS deduction">
                              <Input type="number" value={formData.tds_amount || 0}
                                onChange={(e) => handleChange('tds_amount', Number(e.target.value))}
                                className="h-9 max-w-xs" min={0} step="0.01" />
                            </FormField>
                          </div>
                        )}
                      </div>

                      {/* Other Deductions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="Other Deductions">
                          <Input type="number" value={formData.other_deductions || 0}
                            onChange={(e) => handleChange('other_deductions', Number(e.target.value))}
                            className="h-9" min={0} step="0.01" />
                        </FormField>
                      </div>

                    </div>
                  </div>
                </>
              )}

              {/* Salary Summary */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Gross Salary</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(grossSalary)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Deductions</span>
                  <span className="font-semibold text-red-600">− {formatCurrency(totalDeductions)}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Net Salary</span>
                  <span className="font-bold text-slate-800">{formatCurrency(netSalary)}</span>
                </div>
                {totalDeductions > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {formData.pf_deduction > 0 && <span className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">PF ({formData.pf_percentage}%): {formatCurrency(formData.pf_deduction)}</span>}
                    {esiEnabled && formData.esi_employee > 0 && <span className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">ESI: {formatCurrency(formData.esi_employee)}</span>}
                    {formData.pt_amount > 0 && <span className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">PT: {formatCurrency(formData.pt_amount)}</span>}
                    {tdsEnabled && formData.tds_amount > 0 && <span className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">TDS: {formatCurrency(formData.tds_amount)}</span>}
                    {formData.other_deductions > 0 && <span className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">Other: {formatCurrency(formData.other_deductions)}</span>}
                  </div>
                )}
                <div className="text-xs text-slate-500 pt-0.5">
                  Annual CTC: <span className="font-medium text-slate-700">{formatCurrency(annualCTC)}</span>
                </div>
              </div>

            </div>
          </SectionCard>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-8 px-3 text-sm">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="h-8 bg-blue-600 hover:bg-blue-500 text-white px-4 gap-1.5 text-sm">
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            <Save size={13} /> Save Changes
          </Button>
        </div>

      </form>
    </div>
  );
}