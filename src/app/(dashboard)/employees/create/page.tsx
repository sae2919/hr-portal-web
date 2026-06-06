'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useCreateEmployee, useManagers } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useDesignations } from '@/hooks/useDesignations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Loader2, UserPlus, IndianRupee, Users,
  ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import Link from 'next/link';
import { Department } from '@/types/department';
import { Designation } from '@/types/designation';

const PT_SLABS: Record<string, { upTo: number; pt: number }[]> = {
  'Andhra Pradesh':    [{ upTo: 15000, pt: 0 }, { upTo: Infinity, pt: 200 }],
  'Karnataka':         [{ upTo: 15000, pt: 0 }, { upTo: 25000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Maharashtra':       [{ upTo: 7500,  pt: 0 }, { upTo: 10000, pt: 175 }, { upTo: Infinity, pt: 200 }],
  'Tamil Nadu':        [{ upTo: 21000, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'West Bengal':       [{ upTo: 10000, pt: 0 }, { upTo: 15000, pt: 110 }, { upTo: 25000, pt: 130 }, { upTo: 40000, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Gujarat':           [{ upTo: 5999,  pt: 0 }, { upTo: 8999, pt: 80 }, { upTo: 11999, pt: 150 }, { upTo: Infinity, pt: 200 }],
  'Madhya Pradesh':    [{ upTo: 18750, pt: 0 }, { upTo: Infinity, pt: 208 }],
  'Telangana':         [{ upTo: 15000, pt: 0 }, { upTo: Infinity, pt: 200 }],
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

const schema = z.object({
  first_name:  z.string().min(1, 'First name is required'),
  last_name:   z.string().min(1, 'Last name is required'),
  email:       z.string().email('Valid email required'),
  phone:       z.string().optional().or(z.literal('')),
  gender:      z.enum(['male', 'female', 'other']).optional(),
  blood_group: z.string().optional().or(z.literal('')),
  dob:         z.string().optional().or(z.literal('')),
  pan_number:      z.string().min(1, 'PAN number is required').regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  aadhaar_number:  z.string().min(1, 'Aadhaar is required').regex(/^\d{12}$/, 'Must be 12 digits'),
  driving_license: z.string().optional().or(z.literal('')),
  passport_number: z.string().optional().or(z.literal('')),
  voter_id:        z.string().optional().or(z.literal('')),
  uan_number:      z.string().optional().or(z.literal('')),
  joining_date:    z.string().min(1, 'Joining date is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  status:          z.enum(['active', 'inactive', 'terminated']),
  department_id:   z.number().nullable().optional(),
  designation_id:  z.number().nullable().optional(),
  reporting_to:    z.number().nullable().optional(),
  address: z.string().optional().or(z.literal('')),
  city:    z.string().optional().or(z.literal('')),
  state:   z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  emergency_contact_name:     z.string().min(1, 'Contact name is required'),
  emergency_contact_phone:    z.string().min(1, 'Contact phone is required'),
  emergency_contact_relation: z.string().optional().or(z.literal('')),
  bank_name:           z.string().min(1, 'Bank name is required'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  bank_ifsc:           z.string().min(1, 'IFSC code is required'),
  bank_branch:         z.string().optional().or(z.literal('')),
  basic_salary:     z.number({ message: 'Required' }).min(1, 'Basic salary is required'),
  hra:              z.number().min(0).optional(),
  bonus:            z.number().min(0).optional(),
  allowances:       z.array(z.object({
    type:   z.enum(['transport', 'food', 'medical', 'special', 'other']),
    amount: z.number().min(0),
  })).optional(),
  other_deductions: z.number().min(0).optional(),
  pt_state:         z.string().optional().or(z.literal('')),
  tds_amount:       z.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

function Section({ title, icon, children }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        {icon && <div className="w-5 h-5 bg-slate-50 rounded flex items-center justify-center">{icon}</div>}
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children, error, fullWidth, hint }: {
  label: string; required?: boolean; children: React.ReactNode;
  error?: string; fullWidth?: boolean; hint?: string;
}) {
  return (
    <div className={`space-y-1 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <Label className="text-sm font-medium text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 leading-tight">{hint}</p>}
      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle size={10} />{error}
        </p>
      )}
    </div>
  );
}

function Toggle({
  label, sublabel, enabled, onToggle,
  color = 'blue', disabled = false,
}: {
  label: string; sublabel?: string; enabled: boolean;
  onToggle: () => void; color?: 'blue' | 'green' | 'orange'; disabled?: boolean;
}) {
  const palette = {
    blue:   { track: 'bg-blue-500',   badge: 'bg-blue-50 border-blue-200 text-blue-700'   },
    green:  { track: 'bg-green-500',  badge: 'bg-green-50 border-green-200 text-green-700'  },
    orange: { track: 'bg-orange-500', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
  };
  const c = palette[color];
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all font-medium text-sm
        ${enabled ? c.badge : 'bg-slate-50 border-slate-200 text-slate-500'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}
    >
      <span className={`relative w-7 h-3.5 rounded-full flex-shrink-0 transition-colors ${enabled ? c.track : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
      </span>
      <span className="flex flex-col items-start leading-none gap-0.5">
        <span>{label}</span>
        {sublabel && <span className="text-xs font-normal opacity-70">{sublabel}</span>}
      </span>
    </button>
  );
}

const fmt = (n: number) =>
  '₹' + (isNaN(n) ? '0' : Math.round(n)).toLocaleString('en-IN');

const selectCls = 'w-full border border-slate-200 rounded-lg px-3 py-0 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white';

export default function CreateEmployeePage() {
  const router = useRouter();
  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const { data: departmentsResponse } = useDepartments();
  const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

  const { data: managers = [] } = useManagers();
  const [filterByDept, setFilterByDept] = useState(true);
  const [esiEnabled, setEsiEnabled] = useState(false);
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [showOtherDocs, setShowOtherDocs] = useState(false);
  const [pfPercentage, setPfPercentage] = useState(0);
  const [hraPercentage, setHraPercentage] = useState<number>(0);
  const [allowancesState, setAllowancesState] = useState({
    transport: false, food: false, medical: false, special: false, other: false,
  });
  const [ctcInput, setCtcInput] = useState<string>('');
  const [isCtcFocused, setIsCtcFocused] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employment_type: 'full_time', status: 'active', country: 'India',
      basic_salary: 0, hra: 0, bonus: 0,
      allowances: [], other_deductions: 0, tds_amount: 0, pt_state: 'Telangana',
    },
  });

  const basic      = watch('basic_salary') || 0;
  const hra        = watch('hra')          || 0;
  const bonus      = watch('bonus')        || 0;
  const allowances = watch('allowances')   || [];
  const otherDed   = watch('other_deductions') || 0;
  const tdsAmt     = watch('tds_amount')   || 0;
  const ptState    = watch('pt_state')     || '';
  const employmentType = watch('employment_type') || 'full_time';
  const showFullStructure = employmentType === 'full_time';

  useEffect(() => {
    if (employmentType === 'intern') {
      setValue('hra', 0, { shouldValidate: true });
      setValue('bonus', 0, { shouldValidate: true });
      setValue('allowances', [], { shouldValidate: true });
      setValue('other_deductions', 0, { shouldValidate: true });
      setValue('tds_amount', 0, { shouldValidate: true });
      setValue('pt_state', '', { shouldValidate: true });
      setPfPercentage(0);
      setHraPercentage(0);
      setEsiEnabled(false);
      setTdsEnabled(false);
      setAllowancesState({
        transport: false, food: false, medical: false, special: false, other: false,
      });
    } else if (employmentType === 'full_time') {
      if (!watch('pt_state')) {
        setValue('pt_state', 'Telangana', { shouldValidate: true });
      }
    }
  }, [employmentType, setValue]);

  useEffect(() => {
    const calculatedHra = Math.round((basic * hraPercentage) / 100);
    setValue('hra', calculatedHra, { shouldValidate: true });
  }, [basic, setValue]);

  const totalAllowances = allowances.reduce((s, a) => s + (a?.amount || 0), 0);
  const gross = basic + hra + totalAllowances + bonus;

  const pfAmount      = +(gross * pfPercentage / 100).toFixed(2);
  const esiApplicable = gross <= 21000;
  const esiEmployee   = esiEnabled && esiApplicable ? +(gross * 0.0075).toFixed(2) : 0;
  const esiEmployer   = esiEnabled && esiApplicable ? +(gross * 0.0325).toFixed(2) : 0;
  const ptAmount      = ptState ? calculatePT(ptState, gross) : 0;
  const ptIsNoTax     = ptState ? isNoPTState(ptState) : false;
  const tdsDeduction  = tdsEnabled ? (tdsAmt || 0) : 0;

  const totalDeductions = pfAmount + esiEmployee + ptAmount + tdsDeduction + otherDed;
  const netSalary       = gross - totalDeductions;
  const ctc             = gross + esiEmployer + pfAmount;

  useEffect(() => {
    if (isCtcFocused) return;
    const roundedCtc = Math.round(ctc * 12);
    if (roundedCtc !== Number(ctcInput)) {
      setCtcInput(roundedCtc > 0 ? String(roundedCtc) : '');
    }
  }, [ctc, ctcInput, isCtcFocused]);

  const handleAnnualCTCChange = (valStr: string) => {
    setCtcInput(valStr);
    const val = Number(valStr);
    if (!isNaN(val) && val > 0) {
      const monthlyCTC = val / 12;
      
      if (employmentType === 'intern') {
        const stipend = Math.round(monthlyCTC);
        setValue('basic_salary', stipend, { shouldValidate: true });
        setValue('hra', 0, { shouldValidate: true });
        setValue('bonus', 0, { shouldValidate: true });
        setValue('allowances', [], { shouldValidate: true });
      } else {
        let calculatedGross = 0;
        if (esiEnabled) {
          const factorWithEsi = 1 + (pfPercentage / 100) + 0.0325;
          const grossWithEsi = monthlyCTC / factorWithEsi;
          if (grossWithEsi <= 21000) {
            calculatedGross = grossWithEsi;
          } else {
            const factorWithoutEsi = 1 + (pfPercentage / 100);
            calculatedGross = monthlyCTC / factorWithoutEsi;
          }
        } else {
          const factorWithoutEsi = 1 + (pfPercentage / 100);
          calculatedGross = monthlyCTC / factorWithoutEsi;
        }

        calculatedGross = Math.round(calculatedGross);

        const calculatedBasic = Math.round(calculatedGross * 0.50);
        setHraPercentage(40);
        const calculatedHra = Math.round(calculatedBasic * 0.40);
        const calculatedSpecial = Math.max(0, calculatedGross - calculatedBasic - calculatedHra);

        setValue('basic_salary', calculatedBasic, { shouldValidate: true });
        setValue('hra', calculatedHra, { shouldValidate: true });
        setValue('bonus', 0, { shouldValidate: true });

        setAllowancesState({
          transport: false,
          food: false,
          medical: false,
          special: calculatedSpecial > 0,
          other: false,
        });

        if (calculatedSpecial > 0) {
          setValue('allowances', [{ type: 'special', amount: calculatedSpecial }], { shouldValidate: true });
        } else {
          setValue('allowances', [], { shouldValidate: true });
        }
      }
    } else {
      setValue('basic_salary', 0, { shouldValidate: true });
      setValue('hra', 0, { shouldValidate: true });
      setValue('bonus', 0, { shouldValidate: true });
      setAllowancesState({
        transport: false, food: false, medical: false, special: false, other: false,
      });
      setValue('allowances', [], { shouldValidate: true });
    }
  };

  const handleHraAmountChange = (valStr: string) => {
    const val = Number(valStr) || 0;
    setValue('hra', val, { shouldValidate: true });
    if (basic > 0) {
      const pct = Math.round((val / basic) * 100);
      setHraPercentage(pct);
    }
  };

  const handleSpecialAllowanceChange = (valStr: string) => {
    const val = Number(valStr) || 0;
    const current = watch('allowances') || [];
    const exists = current.find(a => a.type === 'special');
    if (exists) {
      setValue(
        'allowances',
        current.map(a => a.type === 'special' ? { ...a, amount: val } : a),
        { shouldValidate: true }
      );
    } else {
      setValue(
        'allowances',
        [...current, { type: 'special', amount: val }],
        { shouldValidate: true }
      );
    }
  };

  useEffect(() => {
    if (ctcInput && Number(ctcInput) > 0) {
      handleAnnualCTCChange(ctcInput);
    }
  }, [pfPercentage, esiEnabled, employmentType]);

  const selectedDeptId = watch('department_id');
  const { data: designationsResponse } = useDesignations(
    selectedDeptId ? { department_id: selectedDeptId, per_page: 100 } : { per_page: 100 }
  );
  const designations = Array.isArray(designationsResponse?.data) ? designationsResponse.data : [];

  const reportingOptions = managers.filter((m) => {
    if (filterByDept && selectedDeptId) return m.department_id === selectedDeptId;
    return true;
  });

  const toggleAllowance = (type: keyof typeof allowancesState, enabled: boolean) => {
    setAllowancesState(prev => ({ ...prev, [type]: enabled }));
    const current = watch('allowances') || [];
    if (!enabled) {
      setValue('allowances', current.filter((a) => a.type !== type));
    } else if (!current.find((a) => a.type === type)) {
      setValue('allowances', [...current, { type, amount: 0 }]);
    }
  };

  const getAllowanceAmount = (type: string) =>
    (watch('allowances') || []).find((a) => a.type === type)?.amount || '';

  const updateAllowanceAmount = (type: string, amount: number) => {
    const current = watch('allowances') || [];
    const exists  = current.find((a) => a.type === type);
    setValue(
      'allowances',
      exists
        ? current.map((a) => (a.type === type ? { ...a, amount } : a))
        : [...current, { type: type as any, amount }],
      { shouldValidate: true }
    );
  };

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      phone:   data.phone   || undefined,
      dob:     data.dob     || undefined,
      address: data.address || undefined,
      city:    data.city    || undefined,
      state:   data.state   || undefined,
      pincode: data.pincode || undefined,
      department_id:  data.department_id  ?? null,
      designation_id: data.designation_id ?? null,
      reporting_to:   data.reporting_to   ?? null,
      pf_percentage:   pfPercentage,
      pf_deduction:    pfAmount,
      esi_employee:    esiEmployee,
      esi_employer:    esiEmployer,
      pt_amount:       ptAmount,
      pt_state:        data.pt_state || null,
      tds_amount:      tdsDeduction,
      other_deductions: data.other_deductions || 0,
      ctc,
      allowances: data.allowances || [],
    };
    createEmployee(payload as any, { onSuccess: () => router.push('/employees') });
  };

  const ALLOWANCE_TYPES = ['transport', 'food', 'medical', 'other'] as const;

  return (
    <div className="space-y-3" suppressHydrationWarning>

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Link href="/employees">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Add Employee</h2>
            <p className="text-xs text-slate-400">Fill in the details below</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

        {/* Personal Information */}
        <Section title="Personal Information">
          <Field label="First Name" required error={errors.first_name?.message}>
            <Input placeholder="John" {...register('first_name')} className="h-9" />
          </Field>
          <Field label="Last Name" required error={errors.last_name?.message}>
            <Input placeholder="Doe" {...register('last_name')} className="h-9" />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" placeholder="john@company.com" {...register('email')} className="h-9" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input placeholder="+91 9876543210" {...register('phone')} className="h-9" />
          </Field>
          <Field label="Gender">
            <select {...register('gender')} className={selectCls}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" {...register('dob')} className="h-9" />
          </Field>
          <Field label="Blood Group">
            <select {...register('blood_group')} className={selectCls}>
              <option value="">Select blood group</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-','Other'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Identity Documents */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Identity Documents</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="PAN Number" required error={errors.pan_number?.message} hint="Format: ABCDE1234F">
              <Input placeholder="ABCDE1234F" {...register('pan_number')}
                className={`h-9 uppercase ${errors.pan_number ? 'border-red-300' : ''}`}
                style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Aadhaar Number" required error={errors.aadhaar_number?.message} hint="12-digit Aadhaar number">
              <Input placeholder="123456789012" maxLength={12} {...register('aadhaar_number')}
                className={`h-9 ${errors.aadhaar_number ? 'border-red-300' : ''}`} />
            </Field>
            <div className="md:col-span-2">
              <button type="button" onClick={() => setShowOtherDocs(p => !p)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors py-0.5">
                {showOtherDocs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showOtherDocs ? 'Hide other documents' : '+ Add other documents (Driving License, Passport, Voter ID, UAN)'}
              </button>
              {showOtherDocs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-100">
                  <Field label="Driving License" hint="Optional">
                    <Input placeholder="DL-1234567890123" {...register('driving_license')} className="h-9" />
                  </Field>
                  <Field label="Passport Number" hint="Optional">
                    <Input placeholder="A1234567" {...register('passport_number')} className="h-9" />
                  </Field>
                  <Field label="Voter ID" hint="Optional">
                    <Input placeholder="ABC1234567" {...register('voter_id')} className="h-9" />
                  </Field>
                  <Field label="UAN (PF)" hint="Universal Account Number — optional">
                    <Input placeholder="100123456789" {...register('uan_number')} className="h-9" />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Information */}
        <Section title="Job Information" icon={<Users className="w-3 h-3 text-slate-500" />}>
          <Field label="Department" required error={errors.department_id?.message}>
            <SearchableSelect
              options={[
                { id: '' as any, label: 'Select department' },
                ...departments.map((d: Department) => ({
                  id: d.id,
                  label: d.name
                }))
              ]}
              value={watch('department_id') || ''}
              onChange={(val) => {
                const numVal = val === '' ? null : Number(val);
                setValue('department_id', numVal, { shouldValidate: true });
                setValue('designation_id', null, { shouldValidate: true });
              }}
              placeholder="Select department"
            />
          </Field>
          <Field label="Designation" required error={errors.designation_id?.message}>
            <SearchableSelect
              options={[
                { id: '' as any, label: selectedDeptId ? 'Select designation' : 'Select department first' },
                ...designations.map((d: Designation) => ({
                  id: d.id,
                  label: d.title
                }))
              ]}
              value={watch('designation_id') || ''}
              onChange={(val) => {
                const numVal = val === '' ? null : Number(val);
                setValue('designation_id', numVal, { shouldValidate: true });
              }}
              placeholder={selectedDeptId ? 'Select designation' : 'Select department first'}
              disabled={!selectedDeptId}
            />
            {selectedDeptId && designations.length === 0 && (
              <p className="text-xs text-slate-400 mt-0.5">No designations for this department.</p>
            )}
          </Field>

          <div className="md:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-600">Reporting To</Label>
              {selectedDeptId && (
                <button type="button" onClick={() => setFilterByDept(p => !p)}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    filterByDept ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  <span className={`w-5 h-3 rounded-full flex items-center transition-colors ${filterByDept ? 'bg-blue-500' : 'bg-slate-300'}`}>
                    <span className={`w-2 h-2 bg-white rounded-full shadow transition-transform mx-0.5 ${filterByDept ? 'translate-x-2' : 'translate-x-0'}`} />
                  </span>
                  {filterByDept ? 'This department only' : 'All departments'}
                </button>
              )}
            </div>
            <SearchableSelect
              options={[
                { id: '' as any, label: '— No reporting manager —' },
                ...reportingOptions.map((m: any) => ({
                  id: m.id,
                  label: m.full_name,
                  sublabel: (m.designation?.title ? m.designation.title : '') + 
                            (!filterByDept && m.department?.name ? ` (${m.department.name})` : '')
                }))
              ]}
              value={watch('reporting_to') || ''}
              onChange={(val) => {
                setValue('reporting_to', val === '' ? null : Number(val), { shouldValidate: true });
              }}
              placeholder="Select reporting manager"
            />
            <p className="text-xs text-slate-400">
              {!selectedDeptId ? 'Shows all managers. Select a department to filter.'
                : filterByDept ? 'Showing managers in selected department. Toggle to see all.'
                : 'Showing managers from all departments.'}
            </p>
          </div>

          <Field label="Joining Date" required error={errors.joining_date?.message}>
            <Input type="date" {...register('joining_date')} className="h-9" />
          </Field>
          <Field label="Employment Type">
            <select {...register('employment_type')} className={selectCls}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </Field>
          <Field label="Status">
            <select {...register('status')} className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field label="Address" fullWidth>
            <Input placeholder="Street address" {...register('address')} className="h-9" />
          </Field>
          <Field label="City">
            <Input placeholder="Mumbai" {...register('city')} className="h-9" />
          </Field>
          <Field label="State">
            <Input placeholder="Maharashtra" {...register('state')} className="h-9" />
          </Field>
          <Field label="Country">
            <Input placeholder="India" {...register('country')} className="h-9" />
          </Field>
          <Field label="Pincode">
            <Input placeholder="400001" {...register('pincode')} className="h-9" />
          </Field>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact">
          <Field label="Contact Name" required error={errors.emergency_contact_name?.message}>
            <Input placeholder="Jane Doe" {...register('emergency_contact_name')} className="h-9" />
          </Field>
          <Field label="Contact Phone" required error={errors.emergency_contact_phone?.message}>
            <Input placeholder="+91 9876543210" {...register('emergency_contact_phone')} className="h-9" />
          </Field>
          <Field label="Relationship" error={errors.emergency_contact_relation?.message}>
            <select {...register('emergency_contact_relation')} className={selectCls}>
              <option value="">Select relationship</option>
              {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'].map(r => (
                <option key={r} value={r.toLowerCase()}>{r}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Bank Details */}
        <Section title="Bank Details">
          <Field label="Bank Name" required error={errors.bank_name?.message}>
            <Input placeholder="State Bank of India" {...register('bank_name')} className="h-9" />
          </Field>
          <Field label="Account Number" required error={errors.bank_account_number?.message}>
            <Input placeholder="1234567890" {...register('bank_account_number')} className="h-9" />
          </Field>
          <Field label="IFSC Code" required error={errors.bank_ifsc?.message}>
            <Input placeholder="SBIN0001234" {...register('bank_ifsc')} className="h-9" />
          </Field>
          <Field label="Branch">
            <Input placeholder="Mumbai Main Branch" {...register('bank_branch')} className="h-9" />
          </Field>
        </Section>

        {/* Salary Structure */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <div className="w-5 h-5 bg-green-50 rounded flex items-center justify-center">
              <IndianRupee className="w-3 h-3 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Salary Structure</h3>
          </div>

          <div className="space-y-4">

            {/* Annual CTC Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-100 pb-3">
              <Field label="Annual CTC" hint="Enter target annual CTC to auto-fill components">
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
              </Field>
            </div>

            {/* Earnings */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Earnings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label={employmentType === 'intern' ? 'Stipend' : 'Basic Salary'} required error={errors.basic_salary?.message}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <Input type="number" min="0" placeholder={employmentType === 'intern' ? '10000' : '50000'}
                      {...register('basic_salary', { valueAsNumber: true })} className="h-9 pl-7" />
                  </div>
                </Field>
                {showFullStructure && (
                  <>
                    <Field label={`HRA (${hraPercentage}%)`} error={errors.hra?.message}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={watch('hra') || ''}
                          onChange={(e) => handleHraAmountChange(e.target.value)}
                          className="h-9 pl-7"
                        />
                      </div>
                    </Field>
                    <Field label="Special Allowance">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={allowances.find((a: any) => a?.type === 'special')?.amount || ''}
                          onChange={(e) => handleSpecialAllowanceChange(e.target.value)}
                          className="h-9 pl-7"
                        />
                      </div>
                    </Field>
                    <Field label="Bonus">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <Input type="number" min="0" placeholder="2000"
                          {...register('bonus', { valueAsNumber: true })} className="h-9 pl-7" />
                      </div>
                    </Field>
                  </>
                )}
              </div>
            </div>

            {showFullStructure && (
              <>
                {/* Allowances — 2 per row grid */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Allowances</p>
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
                              id={`allow-${type}`}
                              checked={allowancesState[type]}
                              onChange={(e) => toggleAllowance(type, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`allow-${type}`} className="text-sm font-medium text-slate-700 capitalize">
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
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {totalAllowances > 0 && (
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-500">Total Allowances</span>
                        <span className="text-sm font-semibold text-blue-600">{fmt(totalAllowances)}/month</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deductions</p>
                    <div className="flex items-center gap-1.5">
                      <Toggle
                        label="ESI"
                        sublabel={esiEnabled ? (esiApplicable ? `Emp: ${fmt(esiEmployee)} · Emplr: ${fmt(esiEmployer)}` : 'Gross > ₹21,000') : 'Employee & employer'}
                        enabled={esiEnabled}
                        onToggle={() => setEsiEnabled(p => !p)}
                        color="green"
                      />
                      <Toggle
                        label="TDS"
                        sublabel={tdsEnabled ? (tdsAmt > 0 ? fmt(tdsAmt) + '/month' : 'Enter below') : 'Tax deducted at source'}
                        enabled={tdsEnabled}
                        onToggle={() => setTdsEnabled(p => !p)}
                        color="orange"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">

                    {/* PF + PT in one row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-600">PF Deduction</Label>
                        <div className="flex items-center gap-2">
                          <select value={pfPercentage} onChange={(e) => setPfPercentage(Number(e.target.value))}
                            className="w-20 border border-slate-200 rounded-lg px-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                            {Array.from({ length: 13 }, (_, i) => i).map(p => (
                              <option key={p} value={p}>{p}%</option>
                            ))}
                          </select>
                          <div className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 flex items-center gap-1">
                            <span className="text-sm text-slate-400">₹</span>
                            <span className="text-sm font-semibold text-slate-700">
                              {Math.round(pfAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">
                          {pfPercentage === 0 ? 'No PF deduction' : `${pfPercentage}% of ${fmt(gross)} = ${fmt(pfAmount)}/mo`}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-600">Professional Tax</Label>
                        <div className="flex gap-2">
                          <select {...register('pt_state')}
                            className={`flex-1 border rounded-lg px-3 text-sm h-9 focus:outline-none focus:ring-2 transition-colors bg-white ${
                              ptState && ptIsNoTax ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500/20' : 'border-slate-200 focus:ring-blue-500/20'
                            }`}>
                            <option value="">Select state for PT</option>
                            {PT_STATES.map(s => (
                              <option key={s} value={s}>{s}{isNoPTState(s) ? ' (No PT)' : ''}</option>
                            ))}
                          </select>
                          <div className="w-32 h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 flex items-center gap-1">
                            <span className="text-sm text-slate-400">₹</span>
                            <span className="text-sm font-semibold text-slate-700">
                              {Math.round(ptAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        {!ptState && <p className="text-xs text-slate-400">Select state to auto-calculate PT</p>}
                        {ptState && ptIsNoTax && (
                          <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} />No PT in {ptState}</p>
                        )}
                        {ptState && !ptIsNoTax && ptAmount > 0 && <p className="text-xs text-slate-400">PT: {fmt(ptAmount)}/month</p>}
                        {ptState && !ptIsNoTax && ptAmount === 0 && <p className="text-xs text-slate-400">Below PT threshold in {ptState}</p>}
                      </div>
                    </div>

                    {/* ESI panel */}
                    {esiEnabled && (
                      <div className={`rounded-lg border p-2.5 ${esiApplicable ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        {esiApplicable ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">Employee ESI (0.75%)</p>
                              <p className="text-sm font-bold text-green-700">{fmt(esiEmployee)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">Employer ESI (3.25%)</p>
                              <p className="text-sm font-bold text-green-700">{fmt(esiEmployer)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">Eligibility</p>
                              <p className="text-xs font-semibold text-green-700">✓ Gross ≤ ₹21,000</p>
                              <p className="text-xs text-slate-400">{fmt(gross)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-orange-700">ESI not applicable</p>
                              <p className="text-xs text-orange-600">Gross {fmt(gross)} exceeds ₹21,000 limit.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TDS panel */}
                    {tdsEnabled && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-orange-700 mb-1.5">TDS — Tax Deducted at Source</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="Monthly TDS Amount" hint="Enter monthly TDS to deduct" error={errors.tds_amount?.message}>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input type="number" min="0" placeholder="0"
                                {...register('tds_amount', { valueAsNumber: true })}
                                className="h-9 pl-7 bg-white border-orange-200 focus:ring-orange-500/20" />
                            </div>
                          </Field>
                          <div className="flex items-end pb-0.5">
                            <p className="text-xs text-orange-600">
                              Annual TDS: <span className="font-semibold">{fmt(tdsDeduction * 12)}</span>
                              <br /><span className="text-slate-400">monthly × 12</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Other Deductions">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <Input type="number" min="0" placeholder="0"
                            {...register('other_deductions', { valueAsNumber: true })} className="h-9 pl-7" />
                        </div>
                      </Field>
                    </div>

                  </div>
                </div>
              </>
            )}

            {/* Salary Preview */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Salary Preview</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Gross</p>
                  <p className="text-sm font-bold text-slate-700">{fmt(gross)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Deductions</p>
                  <p className="text-sm font-bold text-red-500">− {fmt(totalDeductions)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Net Salary</p>
                  <p className="text-sm font-bold text-slate-700">{fmt(netSalary)}</p>
                </div>
                <div className="bg-blue-600 rounded-lg px-2.5 py-1.5">
                  <p className="text-xs text-blue-200 mb-0.5">CTC (Annual)</p>
                  <p className="text-sm font-extrabold text-white">{fmt(ctc * 12)}</p>
                </div>
              </div>
              {totalDeductions > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200">
                  {pfAmount > 0     && <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">PF ({pfPercentage}%): {fmt(pfAmount)}</span>}
                  {esiEmployee > 0  && <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">ESI: {fmt(esiEmployee)}</span>}
                  {ptAmount > 0     && <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">PT ({ptState}): {fmt(ptAmount)}</span>}
                  {tdsDeduction > 0 && <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">TDS: {fmt(tdsDeduction)}</span>}
                  {otherDed > 0     && <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">Other: {fmt(otherDed)}</span>}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 justify-end pt-1">
          <Link href="/employees">
            <Button type="button" variant="outline" className="h-9">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-9">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>

      </form>
    </div>
  );
}